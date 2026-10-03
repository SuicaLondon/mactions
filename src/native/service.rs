//! Validate launchd service ownership and inspect runner process trees.
use super::{
    commands::{checked, run},
    Native,
};
use crate::core::Runner;
use anyhow::{ensure, Context, Result};
use std::{collections::BTreeSet, fs, path::PathBuf, process::Command, time::Duration};

impl Native {
    pub(super) fn script(&self, r: &Runner, script: &str, args: &[&str]) -> Command {
        let mut cmd = Command::new(r.path.join(script));
        cmd.current_dir(&r.path).args(args);
        // Do not pass the host's GitHub token into runner configuration or future jobs.
        cmd.env_remove("RUNNER_REGISTRATION_TOKEN")
            .env_remove("GH_TOKEN")
            .env_remove("GITHUB_TOKEN")
            .env_remove("GH_ENTERPRISE_TOKEN")
            .env_remove("GITHUB_ENTERPRISE_TOKEN");
        for (key, _) in std::env::vars_os() {
            if key.to_string_lossy().starts_with("ACTIONS_RUNNER_INPUT_") {
                cmd.env_remove(key);
            }
        }
        cmd.env_remove("GITHUB_ACTIONS_RUNNER_SERVICE_TEMPLATE");
        cmd
    }

    pub(super) fn service(&self, r: &Runner) -> Result<Option<(PathBuf, String)>> {
        let dot_service = r.path.join(".service");
        let home = PathBuf::from(std::env::var_os("HOME").context("HOME missing")?);
        let path = if dot_service.exists() {
            PathBuf::from(fs::read_to_string(&dot_service)?.trim())
        } else {
            // svc.sh can be interrupted after writing the plist but before .service.
            // Recover only a plist whose working directory is this already-owned runner.
            let directory = home.join("Library/LaunchAgents");
            if !directory.exists() {
                return Ok(None);
            }
            let mut matches = vec![];
            for entry in fs::read_dir(directory)? {
                let path = entry?.path();
                if !path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .is_some_and(|s| s.starts_with("actions.runner.") && s.ends_with(".plist"))
                {
                    continue;
                }
                if let Ok(value) = plist::Value::from_file(&path) {
                    if value
                        .as_dictionary()
                        .and_then(|d| d.get("WorkingDirectory"))
                        .and_then(plist::Value::as_string)
                        == r.path.to_str()
                    {
                        matches.push(path);
                    }
                }
            }
            ensure!(matches.len() <= 1, "Multiple services point to this managed runner; resolve the duplicate before continuing");
            match matches.pop() {
                Some(path) => path,
                None => return Ok(None),
            }
        };
        ensure!(
            path.parent() == Some(home.join("Library/LaunchAgents").as_path()),
            "Official service path is outside the current user's LaunchAgents directory"
        );
        if !path.exists() {
            return Ok(None);
        }
        let plist = plist::Value::from_file(&path)?;
        let dict = plist.as_dictionary().context("Invalid service plist")?;
        let label = dict
            .get("Label")
            .and_then(plist::Value::as_string)
            .context("Service has no label")?
            .to_string();
        ensure!(
            label.starts_with("actions.runner.")
                && path.file_name().and_then(|s| s.to_str()) == Some(&format!("{label}.plist")),
            "Invalid official service identity"
        );
        ensure!(
            dict.get("WorkingDirectory")
                .and_then(plist::Value::as_string)
                == r.path.to_str(),
            "Service does not belong to this managed runner"
        );
        let expected = r.path.join("runsvc.sh");
        ensure!(
            dict.get("ProgramArguments")
                .and_then(plist::Value::as_array)
                .and_then(|a| a.first())
                .and_then(plist::Value::as_string)
                == expected.to_str(),
            "Service entrypoint does not match this runner"
        );
        Ok(Some((path, label)))
    }

    pub(super) fn service_target(label: &str) -> String {
        format!("gui/{}/{label}", unsafe { libc::getuid() })
    }
    pub(super) fn service_info(&self, label: &str) -> Result<Option<String>> {
        let result = run(
            Command::new("/bin/launchctl").args(["print", &Self::service_target(label)]),
            None,
            Duration::from_secs(10),
        )?;
        if result.ok {
            return Ok(Some(result.text));
        }
        // Do not interpret arbitrary launchctl failures as proof of a stopped service.
        ensure!(
            result.text.contains("Could not find service")
                || result.text.contains("Could not find specified service"),
            "Could not inspect service: {}",
            result.text.trim()
        );
        Ok(None)
    }

    pub(super) fn process_tree(
        &self,
        r: &Runner,
        service_pid: Option<i32>,
    ) -> Result<Vec<(i32, String)>> {
        let output = checked(
            Command::new("/bin/ps").args(["-axo", "pid=,ppid=,lstart=,command="]),
            10,
        )?;
        let mut all = Vec::new();
        for line in output.lines() {
            let fields: Vec<_> = line.split_whitespace().collect();
            if fields.len() < 8 {
                continue;
            }
            if let (Ok(pid), Ok(ppid)) = (fields[0].parse::<i32>(), fields[1].parse::<i32>()) {
                all.push((pid, ppid, fields[2..7].join(" "), fields[7..].join(" ")));
            }
        }
        let prefix = format!("{}/", r.path.display());
        let mut selected = BTreeSet::new();
        if let Some(pid) = service_pid {
            selected.insert(pid);
        }
        for (pid, _, _, cmd) in &all {
            if cmd.contains(&prefix) && (*pid as u32) != std::process::id() {
                selected.insert(*pid);
            }
        }
        loop {
            let before = selected.len();
            for (pid, parent, _, _) in &all {
                if selected.contains(parent) {
                    selected.insert(*pid);
                }
            }
            if selected.len() == before {
                break;
            }
        }
        Ok(all
            .into_iter()
            .filter(|p| selected.contains(&p.0))
            .map(|p| (p.0, p.2))
            .collect())
    }
}

pub(super) fn service_pid(text: &str) -> Option<i32> {
    text.lines()
        .find_map(|line| {
            line.trim()
                .strip_prefix("pid = ")
                .and_then(|s| s.parse().ok())
        })
        .filter(|pid| *pid > 0)
}
