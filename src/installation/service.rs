//! Login service ownership and lifecycle for the manager, never runner services.
use super::config;
use anyhow::{bail, ensure, Context, Result};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Seek, SeekFrom},
    os::unix::{fs::MetadataExt, process::CommandExt},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InstallSource {
    Script { directory: PathBuf },
    Homebrew { brew: PathBuf, executable: PathBuf },
    Manual { executable: PathBuf },
}

impl InstallSource {
    fn name(&self) -> &'static str {
        match self {
            Self::Script { .. } => "script",
            Self::Homebrew { .. } => "homebrew",
            Self::Manual { .. } => "manual",
        }
    }

    fn executable(&self) -> PathBuf {
        match self {
            Self::Script { directory } => directory.join("current/mactions"),
            Self::Homebrew { executable, .. } | Self::Manual { executable } => executable.clone(),
        }
    }
}

pub fn source() -> Result<InstallSource> {
    detect_source(&std::env::current_exe()?, &home()?)
}

fn home() -> Result<PathBuf> {
    Ok(PathBuf::from(
        std::env::var_os("HOME").context("HOME is not set")?,
    ))
}

fn detect_source(executable: &Path, home: &Path) -> Result<InstallSource> {
    let directory = home.join(".local/share/mactions");
    if script_source(executable, &directory)? {
        return Ok(InstallSource::Script { directory });
    }
    for ancestor in executable.ancestors() {
        if ancestor.file_name().is_some_and(|name| name == "mactions") {
            if let Some(parent) = ancestor.parent() {
                if parent
                    .file_name()
                    .is_some_and(|name| name == "Cellar" || name == "opt")
                {
                    let prefix = parent
                        .parent()
                        .context("Invalid Homebrew installation path")?;
                    return Ok(InstallSource::Homebrew {
                        brew: prefix.join("bin/brew"),
                        executable: prefix.join("opt/mactions/bin/mactions"),
                    });
                }
            }
        }
    }
    Ok(InstallSource::Manual {
        executable: executable.to_path_buf(),
    })
}

fn script_source(executable: &Path, directory: &Path) -> Result<bool> {
    let canonical_directory = match directory.canonicalize() {
        Ok(directory) => directory,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error.into()),
    };
    let canonical_executable = executable.canonicalize()?;
    if !canonical_executable.starts_with(&canonical_directory) {
        return Ok(false);
    }
    let marker = directory.join("install.json");
    let metadata = match fs::symlink_metadata(&marker) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error.into()),
    };
    ensure!(
        metadata.is_file()
            && !metadata.file_type().is_symlink()
            && metadata.uid() == unsafe { libc::getuid() }
            && metadata.mode() & 0o022 == 0,
        "Installation marker is not securely owned by this account"
    );
    let marker: Value = serde_json::from_slice(&fs::read(marker)?)?;
    if marker["schema"] != 1 || marker["source"] != "script" {
        return Ok(false);
    }
    let Ok(relative) = canonical_executable.strip_prefix(canonical_directory.join("releases"))
    else {
        return Ok(false);
    };
    let parts: Vec<_> = relative.components().collect();
    Ok(parts.len() == 2 && parts[1].as_os_str() == "mactions" && canonical_executable.is_file())
}

struct Service {
    root: PathBuf,
    home: PathBuf,
    label: String,
    path: PathBuf,
    source: InstallSource,
}

impl Service {
    fn new(root: &Path) -> Result<Self> {
        Self::at(root.canonicalize()?, home()?, source()?)
    }

    fn at(root: PathBuf, home: PathBuf, source: InstallSource) -> Result<Self> {
        let digest = Sha256::digest(root.as_os_str().as_encoded_bytes());
        let label = format!("io.mactions.manager.{:x}", digest);
        let path = home
            .join("Library/LaunchAgents")
            .join(format!("{label}.plist"));
        Ok(Self {
            root,
            home,
            label,
            path,
            source,
        })
    }

    fn domain(&self) -> String {
        // getuid reads the current account; the service never changes its identity.
        format!("gui/{}", unsafe { libc::getuid() })
    }

    fn target(&self) -> String {
        format!("{}/{}", self.domain(), self.label)
    }

    fn default_root(&self) -> bool {
        let mut default = self.home.join(".mactions");
        let legacy = self.home.join("Library/Application Support/mactions");
        if !default.exists() && legacy.join("records").is_dir() {
            default = legacy;
        }
        self.root == default.canonicalize().unwrap_or(default)
    }

    fn check_source(&self) -> Result<()> {
        if matches!(self.source, InstallSource::Homebrew { .. }) {
            ensure!(self.default_root(), "Homebrew services use the default data directory; use that directory for manager service commands");
            ensure!(!self.path.exists(), "A separate manager login service is installed. Remove that service before starting Homebrew services");
        } else if self.default_root() {
            ensure!(!self.home.join("Library/LaunchAgents/homebrew.mxcl.mactions.plist").exists(), "Homebrew already owns the manager service. Use the Homebrew installation for service commands");
        }
        Ok(())
    }

    fn plist(&self) -> Result<plist::Value> {
        let mut dictionary = plist::Dictionary::new();
        dictionary.insert("Label".into(), self.label.clone().into());
        dictionary.insert(
            "MactionsDataDirectory".into(),
            path_text(&self.root)?.into(),
        );
        dictionary.insert("WorkingDirectory".into(), path_text(&self.root)?.into());
        dictionary.insert(
            "ProgramArguments".into(),
            plist::Value::Array(vec![
                path_text(&self.source.executable())?.into(),
                "--data-dir".into(),
                path_text(&self.root)?.into(),
                "serve".into(),
            ]),
        );
        dictionary.insert("RunAtLoad".into(), true.into());
        dictionary.insert("KeepAlive".into(), true.into());
        dictionary.insert("ExitTimeOut".into(), plist::Value::Integer(120u64.into()));
        dictionary.insert(
            "StandardOutPath".into(),
            path_text(&self.root.join("manager-logs/stdout.log"))?.into(),
        );
        dictionary.insert(
            "StandardErrorPath".into(),
            path_text(&self.root.join("manager-logs/stderr.log"))?.into(),
        );
        let mut environment = plist::Dictionary::new();
        environment.insert("HOME".into(), path_text(&self.home)?.into());
        environment.insert(
            "PATH".into(),
            std::env::var("PATH")
                .unwrap_or_else(|_| "/usr/bin:/bin:/usr/sbin:/sbin".into())
                .into(),
        );
        for key in ["GH_CONFIG_DIR", "XDG_CONFIG_HOME"] {
            if let Ok(value) = std::env::var(key) {
                environment.insert(key.into(), value.into());
            }
        }
        dictionary.insert("EnvironmentVariables".into(), environment.into());
        Ok(dictionary.into())
    }

    fn owned(&self) -> Result<bool> {
        let metadata = match fs::symlink_metadata(&self.path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
            Err(error) => return Err(error.into()),
        };
        // Only an ordinary plist owned by this account can authorize lifecycle changes.
        ensure!(
            metadata.is_file()
                && !metadata.file_type().is_symlink()
                && metadata.uid() == unsafe { libc::getuid() }
                && metadata.mode() & 0o022 == 0,
            "Manager service plist is not securely owned by the current account"
        );
        validate_plist(self, &plist::Value::from_file(&self.path)?)?;
        Ok(true)
    }

    fn info(&self) -> Result<Option<String>> {
        let output = run(Command::new("/bin/launchctl").args(["print", &self.target()]))?;
        if output.ok {
            return Ok(Some(output.text));
        }
        ensure!(
            missing_service(&output.text),
            "Could not inspect manager service: {}",
            output.text.trim()
        );
        Ok(None)
    }

    fn has_login(&self) -> Result<bool> {
        let output = run(Command::new("/bin/launchctl").args(["print", &self.domain()]))?;
        login_available(&output)
    }

    fn response(&self, installed: bool, running: bool, state: &str) -> Result<Value> {
        Ok(json!({
            "source": self.source.name(), "managed": installed,
            "installed": installed, "running": running, "state": state,
            "current_process": false,
            "label": self.label, "address": config::address(&self.root)?,
            "url": "http://127.0.0.1:8787", "data_dir": self.root,
        }))
    }

    fn brew(&self, action: &str) -> Result<()> {
        let InstallSource::Homebrew { brew, .. } = &self.source else {
            bail!("This installation is not managed by Homebrew");
        };
        checked(
            Command::new(brew)
                .args(["services", action, "mactions"])
                .env("HOMEBREW_NO_AUTO_UPDATE", "1"),
        )?;
        Ok(())
    }

    fn brew_status(&self) -> Result<Value> {
        let InstallSource::Homebrew { brew, .. } = &self.source else {
            bail!("This installation is not managed by Homebrew");
        };
        let output = checked(
            Command::new(brew)
                .args(["services", "info", "mactions", "--json"])
                .env("HOMEBREW_NO_AUTO_UPDATE", "1"),
        )?;
        let rows: Value =
            serde_json::from_str(&output).context("Invalid Homebrew service status")?;
        let row = rows
            .as_array()
            .and_then(|rows| rows.first())
            .context("Homebrew did not return manager service status")?;
        let installed = row["registered"].as_bool().unwrap_or(false);
        let running = row["running"].as_bool().unwrap_or(false)
            && row["pid"].as_u64().is_some_and(|pid| pid > 0);
        let mut state = "stopped";
        if running {
            state = "running";
        } else if installed && !self.has_login()? {
            state = "pending_login";
        }
        let mut response = self.response(installed, running, state)?;
        response["managed"] = json!(true);
        response["label"] = json!("homebrew.mxcl.mactions");
        response["current_process"] =
            json!(running && row["pid"].as_u64() == Some(u64::from(std::process::id())));
        Ok(response)
    }
}

fn path_text(path: &Path) -> Result<String> {
    Ok(path
        .to_str()
        .context("Manager service paths must be valid UTF-8")?
        .into())
}

fn validate_plist(service: &Service, value: &plist::Value) -> Result<()> {
    let expected = service.plist()?;
    let actual = value
        .as_dictionary()
        .context("Invalid manager service plist")?;
    let expected = expected
        .as_dictionary()
        .context("Invalid generated manager service plist")?;
    for key in [
        "Label",
        "MactionsDataDirectory",
        "WorkingDirectory",
        "ProgramArguments",
    ] {
        ensure!(
            actual.get(key) == expected.get(key),
            "Manager service belongs to another installation or data directory ({key})"
        );
    }
    Ok(())
}

fn missing_service(text: &str) -> bool {
    text.contains("Could not find service")
        || text.contains("Could not find specified service")
        || text.contains("Could not find domain")
}

fn login_available(output: &Output) -> Result<bool> {
    if output.ok {
        return Ok(true);
    }
    ensure!(
        unavailable_login_domain(&output.text),
        "Could not inspect macOS login session: {}",
        output.text.trim()
    );
    Ok(false)
}

fn unavailable_login_domain(text: &str) -> bool {
    // launchctl can resolve a user domain before its GUI login domain is usable.
    missing_service(text) || text.contains("125: Domain does not support specified action")
}

fn service_pid(info: &str) -> Option<u32> {
    info.lines().find_map(|line| {
        line.trim()
            .strip_prefix("pid = ")
            .and_then(|pid| pid.parse().ok())
            .filter(|pid| *pid > 0)
    })
}

pub fn install(root: &Path) -> Result<Value> {
    fs::create_dir_all(root)?;
    let service = Service::new(root)?;
    service.check_source()?;
    config::save(root, &config::load(root)?)?;
    if matches!(service.source, InstallSource::Homebrew { .. }) {
        return service.brew_status();
    }
    service.owned()?;
    let parent = service
        .path
        .parent()
        .context("Invalid manager service path")?;
    fs::create_dir_all(parent)?;
    fs::create_dir_all(root.join("manager-logs"))?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
    service.plist()?.to_writer_xml(temporary.as_file_mut())?;
    temporary.as_file().sync_all()?;
    temporary.persist(&service.path)?;
    status(root)
}

pub fn status(root: &Path) -> Result<Value> {
    let service = Service::new(root)?;
    service.check_source()?;
    if matches!(service.source, InstallSource::Homebrew { .. }) {
        return service.brew_status();
    }
    if !service.owned()? {
        return service.response(false, false, "unmanaged");
    }
    if !service.has_login()? {
        return service.response(true, false, "pending_login");
    }
    if let Some(info) = service.info()? {
        if let Some(pid) = service_pid(&info) {
            let mut response = service.response(true, true, "running")?;
            response["current_process"] = json!(pid == std::process::id());
            return Ok(response);
        }
        return service.response(true, false, "loaded_without_process");
    }
    service.response(true, false, "stopped")
}

pub fn start(root: &Path) -> Result<Value> {
    let service = Service::new(root)?;
    service.check_source()?;
    if matches!(service.source, InstallSource::Homebrew { .. }) {
        service.brew("start")?;
        return service.brew_status();
    }
    if !service.owned()? {
        install(root)?;
    }
    let enabled = run(Command::new("/bin/launchctl").args(["enable", &service.target()]))?;
    if !service.has_login()? {
        let mut response = service.response(true, false, "pending_login")?;
        if !enabled.ok {
            ensure!(
                unavailable_login_domain(&enabled.text),
                "Could not enable manager service: {}",
                enabled.text.trim()
            );
            response["message"] = json!("Installed for the next macOS login. If the service was previously stopped, run mactions service start after logging in to enable it.");
        }
        return Ok(response);
    }
    ensure!(
        enabled.ok,
        "Could not enable manager service: {}",
        enabled.text.trim()
    );
    let version = executable_version(&service.source.executable())?;
    if service.info()?.is_none() {
        checked(Command::new("/bin/launchctl").args([
            "bootstrap",
            &service.domain(),
            &path_text(&service.path)?,
        ]))?;
    } else {
        checked(Command::new("/bin/launchctl").args(["kickstart", &service.target()]))?;
    }
    let begin = Instant::now();
    while begin.elapsed() < Duration::from_secs(10) {
        if let Some(pid) = service.info()?.as_deref().and_then(service_pid) {
            if healthy(
                "http://127.0.0.1:8787/api/manager/health",
                &version,
                &service.root,
                pid,
            )? && service.info()?.as_deref().and_then(service_pid) == Some(pid)
            {
                return service.response(true, true, "running");
            }
        }
        thread::sleep(Duration::from_millis(100));
    }
    bail!("Manager service did not report the expected version and data directory. Check for a port conflict and inspect {}", root.join("manager-logs/stderr.log").display())
}

fn executable_version(executable: &Path) -> Result<String> {
    let output = checked(Command::new(executable).arg("--version"))?;
    let version = output
        .trim()
        .strip_prefix("mactions ")
        .context("The manager executable returned an invalid version")?;
    ensure!(
        !version.is_empty() && !version.contains(char::is_whitespace),
        "The manager executable returned an invalid version"
    );
    Ok(version.into())
}

fn healthy(url: &str, version: &str, root: &Path, pid: u32) -> Result<bool> {
    let root = root.canonicalize()?;
    let output = run(Command::new("/usr/bin/curl").args([
        "--fail",
        "--silent",
        "--show-error",
        "--noproxy",
        "*",
        "--connect-timeout",
        "1",
        "--max-time",
        "2",
        url,
    ]))?;
    if !output.ok {
        return Ok(false);
    }
    let Ok(value) = serde_json::from_str::<Value>(&output.text) else {
        return Ok(false);
    };
    Ok(value["version"] == version
        && value["data_dir"].as_str() == root.to_str()
        && value["process_id"].as_u64() == Some(u64::from(pid)))
}

pub fn stop(root: &Path) -> Result<Value> {
    let service = Service::new(root)?;
    service.check_source()?;
    if matches!(service.source, InstallSource::Homebrew { .. }) {
        service.brew("stop")?;
        return service.brew_status();
    }
    if !service.owned()? {
        return service.response(false, false, "unmanaged");
    }
    let info = if service.has_login()? {
        service.info()?
    } else {
        None
    };
    let pid = info.as_deref().and_then(service_pid);
    let identity = pid.map(process_identity).transpose()?.flatten();
    checked(Command::new("/bin/launchctl").args(["disable", &service.target()]))?;
    if info.is_some() {
        checked(Command::new("/bin/launchctl").args(["bootout", &service.target()]))?;
    }
    if let (Some(pid), Some(identity)) = (pid, identity) {
        let begin = Instant::now();
        while process_identity(pid)?.as_deref() == Some(&identity) {
            ensure!(begin.elapsed() < Duration::from_secs(120), "The manager has not finished shutting down. Its service is disabled; inspect manager-logs before retrying");
            thread::sleep(Duration::from_millis(100));
        }
    }
    service.response(true, false, "stopped")
}

pub(crate) fn process_identity(pid: u32) -> Result<Option<String>> {
    let output = run(Command::new("/bin/ps").args(["-p", &pid.to_string(), "-o", "lstart="]))?;
    if !output.ok || output.text.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some(
        output.text.split_whitespace().collect::<Vec<_>>().join(" "),
    ))
}

pub fn restart(root: &Path) -> Result<Value> {
    let service = Service::new(root)?;
    service.check_source()?;
    if matches!(service.source, InstallSource::Homebrew { .. }) {
        service.brew("restart")?;
        return service.brew_status();
    }
    stop(root)?;
    start(root)
}

pub fn remove(root: &Path) -> Result<Value> {
    let service = Service::new(root)?;
    service.check_source()?;
    if matches!(service.source, InstallSource::Homebrew { .. }) {
        service.brew("stop")?;
        return service.brew_status();
    }
    if service.owned()? {
        stop(root)?;
        fs::remove_file(&service.path)?;
    }
    service.response(false, false, "unmanaged")
}

pub fn open(root: &Path) -> Result<Value> {
    let mut response = status(root)?;
    if response["running"] != true {
        response = start(root)?;
    }
    ensure!(response["running"] == true, "The manager is installed for the next login. Log in to this Mac before opening its dashboard");
    checked(Command::new("/usr/bin/open").arg("http://127.0.0.1:8787"))?;
    Ok(response)
}

struct Output {
    ok: bool,
    text: String,
}

fn run(command: &mut Command) -> Result<Output> {
    let mut capture = tempfile::tempfile()?;
    let mut child = command
        .stdin(Stdio::null())
        .stdout(capture.try_clone()?)
        .stderr(capture.try_clone()?)
        .process_group(0)
        .spawn()
        .context("Could not launch manager service command")?;
    let begin = Instant::now();
    let status = loop {
        if let Some(status) = child.try_wait()? {
            break status;
        }
        if begin.elapsed() >= Duration::from_secs(60) {
            // This process group contains only the transient launchctl or brew command.
            unsafe {
                libc::kill(-(child.id() as i32), libc::SIGKILL);
            }
            child.wait()?;
            bail!("Manager service command timed out");
        }
        thread::sleep(Duration::from_millis(50));
    };
    capture.seek(SeekFrom::Start(0))?;
    let mut text = String::new();
    capture.take(65536).read_to_string(&mut text)?;
    Ok(Output {
        ok: status.success(),
        text,
    })
}

fn checked(command: &mut Command) -> Result<String> {
    let output = run(command)?;
    ensure!(
        output.ok,
        "Manager service command failed: {}",
        output.text.trim()
    );
    Ok(output.text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unsupported_gui_domain_waits_for_login() {
        let output = Output {
            ok: false,
            text: "Could not print domain: 125: Domain does not support specified action\n".into(),
        };
        assert!(!login_available(&output).unwrap());
        assert!(unavailable_login_domain(
            "Could not enable service: 125: Domain does not support specified action\n"
        ));
    }

    #[test]
    fn login_probe_preserves_success_missing_domain_and_unexpected_errors() {
        assert!(login_available(&Output {
            ok: true,
            text: "gui/501 = {}".into(),
        })
        .unwrap());
        assert!(!login_available(&Output {
            ok: false,
            text: "Could not find domain for user gui: 501".into(),
        })
        .unwrap());
        let denied = "Could not print domain: 1: Operation not permitted";
        assert!(login_available(&Output {
            ok: false,
            text: denied.into(),
        })
        .is_err());
        assert!(!unavailable_login_domain(denied));
    }

    fn fixture(directory: &Path) -> Service {
        Service::at(
            directory.join("data"),
            directory.join("home"),
            InstallSource::Script {
                directory: directory.join("home/.local/share/mactions"),
            },
        )
        .unwrap()
    }

    #[test]
    fn script_plist_keeps_the_stable_executable_and_validates_ownership() {
        let directory = tempfile::tempdir().unwrap();
        let service = fixture(directory.path());
        let plist = service.plist().unwrap();
        validate_plist(&service, &plist).unwrap();
        let args = plist.as_dictionary().unwrap()["ProgramArguments"]
            .as_array()
            .unwrap();
        assert_eq!(
            args[0].as_string().unwrap(),
            directory
                .path()
                .join("home/.local/share/mactions/current/mactions")
                .to_str()
                .unwrap()
        );
        assert_eq!(args[2].as_string().unwrap(), service.root.to_str().unwrap());
        let mut unrelated = plist;
        unrelated
            .as_dictionary_mut()
            .unwrap()
            .insert("Label".into(), "actions.runner.unrelated".into());
        assert!(validate_plist(&service, &unrelated).is_err());
    }

    #[test]
    fn data_roots_have_distinct_manager_service_labels() {
        let directory = tempfile::tempdir().unwrap();
        let first = fixture(directory.path());
        let mut second = fixture(directory.path());
        second.root = directory.path().join("other-data");
        second = Service::at(second.root, second.home, second.source).unwrap();
        assert_ne!(first.label, second.label);
        assert!(validate_plist(&second, &first.plist().unwrap()).is_err());
    }

    #[test]
    fn old_script_versions_still_resolve_to_the_current_link() {
        let temporary = tempfile::tempdir().unwrap();
        let home = temporary.path();
        let directory = home.join(".local/share/mactions");
        let executable = directory.join("releases/0.1.0/mactions");
        fs::create_dir_all(executable.parent().unwrap()).unwrap();
        fs::write(&executable, "fixture").unwrap();
        fs::write(
            directory.join("install.json"),
            br#"{"schema":1,"source":"script"}"#,
        )
        .unwrap();
        let source = detect_source(&executable, home).unwrap();
        assert_eq!(
            source.executable(),
            home.join(".local/share/mactions/current/mactions")
        );
    }

    #[test]
    fn unmarked_or_external_script_paths_are_manual_installations() {
        let temporary = tempfile::tempdir().unwrap();
        let home = temporary.path();
        let directory = home.join(".local/share/mactions");
        let executable = directory.join("releases/0.1.0/mactions");
        fs::create_dir_all(executable.parent().unwrap()).unwrap();
        fs::write(&executable, "fixture").unwrap();
        assert!(matches!(
            detect_source(&executable, home).unwrap(),
            InstallSource::Manual { .. }
        ));
        fs::write(
            directory.join("install.json"),
            br#"{"schema":1,"source":"script"}"#,
        )
        .unwrap();
        let foreign = home.join("foreign-mactions");
        fs::write(&foreign, "fixture").unwrap();
        fs::remove_file(&executable).unwrap();
        std::os::unix::fs::symlink(foreign, &executable).unwrap();
        assert!(matches!(
            detect_source(&executable, home).unwrap(),
            InstallSource::Manual { .. }
        ));
    }

    #[test]
    fn homebrew_cellar_binaries_resolve_to_the_opt_wrapper() {
        let source = detect_source(
            Path::new("/opt/homebrew/Cellar/mactions/0.1.0/libexec/mactions"),
            Path::new("/Users/operator"),
        )
        .unwrap();
        assert_eq!(
            source,
            InstallSource::Homebrew {
                brew: "/opt/homebrew/bin/brew".into(),
                executable: "/opt/homebrew/opt/mactions/bin/mactions".into()
            }
        );
    }

    #[test]
    fn foreign_plist_and_symlinks_do_not_authorize_service_changes() {
        let directory = tempfile::tempdir().unwrap();
        let service = fixture(directory.path());
        fs::create_dir_all(service.path.parent().unwrap()).unwrap();
        let foreign = directory.path().join("foreign.plist");
        service.plist().unwrap().to_file_xml(&foreign).unwrap();
        std::os::unix::fs::symlink(&foreign, &service.path).unwrap();
        assert!(service.owned().is_err());
        fs::remove_file(&service.path).unwrap();
        fs::copy(&foreign, &service.path).unwrap();
        assert!(service.owned().unwrap());
    }

    #[test]
    fn health_probe_rejects_a_different_version_data_directory_or_process() {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path().canonicalize().unwrap();
        for (version, reported_root, pid, expected) in [
            ("0.2.0", root.clone(), 42, true),
            ("0.1.0", root.clone(), 42, false),
            ("0.2.0", root.join("another-manager"), 42, false),
            ("0.2.0", root.clone(), 43, false),
        ] {
            let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
            let url = format!("http://{}/api/manager/health", server.server_addr());
            let response =
                json!({"version":version,"data_dir":reported_root,"process_id":pid}).to_string();
            let worker = thread::spawn(move || {
                let request = server
                    .recv_timeout(Duration::from_secs(5))
                    .unwrap()
                    .unwrap();
                assert_eq!(request.url(), "/api/manager/health");
                request
                    .respond(tiny_http::Response::from_string(response))
                    .unwrap();
            });
            assert_eq!(
                healthy(&url, "0.2.0", directory.path(), 42).unwrap(),
                expected
            );
            worker.join().unwrap();
        }
    }

    #[test]
    fn startup_uses_the_stable_executable_version_instead_of_the_callers_version() {
        use std::os::unix::fs::PermissionsExt;
        let directory = tempfile::tempdir().unwrap();
        let executable = directory.path().join("mactions");
        fs::write(&executable, "#!/bin/sh\nprintf 'mactions 0.3.0\\n'\n").unwrap();
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o755)).unwrap();
        assert_eq!(executable_version(&executable).unwrap(), "0.3.0");
    }
}
