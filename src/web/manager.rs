//! Host settings and detached updates; runner lifecycle remains independent.
use crate::installation::{self, config, service, update};
use anyhow::{ensure, Context, Result};
use fs2::FileExt;
use serde_json::{json, Value};
use std::{
    fs::{self, OpenOptions},
    os::unix::{fs::OpenOptionsExt, process::CommandExt},
    path::Path,
    process::{Command, Stdio},
};

fn settings(root: &Path) -> Result<Value> {
    let settings = config::load(root)?;
    let service = service::status(root)?;
    Ok(
        json!({"lan_access":settings.lan_access,"version":env!("CARGO_PKG_VERSION"),
        "process_id":std::process::id(),
        "source":service["source"],"managed":service["current_process"].as_bool().unwrap_or(false)}),
    )
}

pub(super) fn get(path: &str, root: &Path) -> Result<Option<Value>> {
    let value = match path {
        "/api/manager/health" => {
            json!({"version":env!("CARGO_PKG_VERSION"),"data_dir":root,"process_id":std::process::id()})
        }
        "/api/manager/settings" => settings(root)?,
        "/api/manager/update" => {
            let mut check = update::check(root)?;
            if check["can_update"] == true && service::status(root)?["current_process"] != true {
                check["can_update"] = json!(false);
                check["message"] = json!("Open the managed dashboard with mactions open before updating from the browser.");
            }
            check
        }
        "/api/manager/update-status" => {
            let mut state = update::status(root)?;
            if let Ok(log) = fs::read(root.join("update.log")) {
                let start = log.len().saturating_sub(16384);
                state["log"] = Value::String(String::from_utf8_lossy(&log[start..]).into_owned());
            }
            state
        }
        _ => return Ok(None),
    };
    Ok(Some(value))
}

fn spawn(root: &Path, command: &str, log_name: &str) -> Result<std::process::Child> {
    let log = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .mode(0o600)
        .open(root.join(log_name))?;
    Command::new(std::env::current_exe()?)
        .args(["--data-dir"])
        .arg(root)
        .arg(command)
        .stdin(Stdio::null())
        .stdout(log.try_clone()?)
        .stderr(log)
        .process_group(0)
        .spawn()
        .context("Could not start the background operation")
}

pub(super) fn post(path: &str, payload: &Value, root: &Path) -> Result<Option<Value>> {
    let value =
        match path {
            "/api/manager/settings" => {
                let _guard = installation::operation_guard(root)?;
                ensure!(
                    payload["lan_access"].is_boolean(),
                    "Expected a lan_access boolean"
                );
                let settings_value: config::Settings = serde_json::from_value(payload.clone())?;
                let old = config::load(root)?;
                config::save(root, &settings_value)?;
                let mut saved = settings(root)?;
                let restart_scheduled =
                    saved["managed"] == true && old.lan_access != settings_value.lan_access;
                saved["restart_scheduled"] = json!(restart_scheduled);
                if restart_scheduled {
                    if let Err(error) = spawn(root, "_service-restart", "service-operation.log") {
                        config::save(root, &old)?;
                        return Err(error);
                    }
                }
                saved
            }
            "/api/manager/update" => {
                ensure!(
                    !matches!(service::source()?, service::InstallSource::Manual { .. }),
                    "Install mactions using the installation script or Homebrew before updating"
                );
                ensure!(service::status(root)?["current_process"] == true,
                "Open the managed dashboard with mactions open before updating from the browser");
                let existing = update::status(root)?;
                ensure!(
                    existing["state"] != "running",
                    "Another update is already running"
                );
                let lock = OpenOptions::new()
                    .create(true)
                    .truncate(false)
                    .read(true)
                    .write(true)
                    .open(root.join("update.lock"))?;
                lock.try_lock_exclusive()
                    .context("Another update is already running")?;
                let existing = update::status(root)?;
                ensure!(
                    existing["state"] != "running",
                    "Another update is already running"
                );
                let _guard = installation::operation_guard(root)?;
                let mut state = json!({"state":"running","message":"Starting update",
                "from_version":env!("CARGO_PKG_VERSION"),"to_version":""});
                save_update_state(root, &state)?;
                match spawn(root, "_update", "update.log") {
                    Ok(child) => {
                        state["pid"] = json!(child.id());
                        state["process_identity"] = json!(service::process_identity(child.id())?);
                    }
                    Err(error) => {
                        state["state"] = json!("failed");
                        state["message"] = json!(format!("{error:#}"));
                        save_update_state(root, &state)?;
                        return Err(error);
                    }
                }
                save_update_state(root, &state)?;
                state
            }
            _ => return Ok(None),
        };
    Ok(Some(value))
}

fn save_update_state(root: &Path, state: &Value) -> Result<()> {
    let temporary = root.join("update-queued.json.tmp");
    fs::write(&temporary, serde_json::to_vec_pretty(state)?)?;
    fs::rename(temporary, root.join("update.json"))?;
    Ok(())
}
