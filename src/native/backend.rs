//! Native implementation of the runner lifecycle and GitHub backend contract.
use super::{
    commands::{checked, run},
    github::download_log,
    service::service_pid,
    Native,
};
use crate::core::{Backend, Runner};
use anyhow::{bail, ensure, Context, Result};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant},
};

impl Native {
    fn checksum(path: &Path) -> Result<String> {
        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0; 65536];
        loop {
            let n = file.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
        Ok(format!("{:x}", hasher.finalize()))
    }
}

impl Backend for Native {
    fn github_cli(&self) -> Option<PathBuf> {
        Some(self.gh.clone())
    }
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        // The runner list is paginated for both name collision checks and status lookup.
        if method == "GET" && endpoint.ends_with("/actions/runners?per_page=100") {
            let mut runners = vec![];
            for page in 1..=1000 {
                let data = self.api_page("GET", &format!("{endpoint}&page={page}"), None)?;
                let batch = data["runners"]
                    .as_array()
                    .context("Invalid GitHub runner list")?;
                runners.extend(batch.iter().cloned());
                if batch.len() < 100 {
                    return Ok(json!({"runners":runners}));
                }
            }
            bail!("GitHub runner list exceeds the supported page limit");
        }
        if method == "DELETE" {
            // A successful list with the ID absent is an idempotent delete, unlike a raw 404.
            if let Some((base, id)) = endpoint.rsplit_once('/') {
                let id: u64 = id.parse()?;
                let list = self.api("GET", &format!("{base}?per_page=100"), None)?;
                if !list["runners"]
                    .as_array()
                    .context("Invalid runner list")?
                    .iter()
                    .any(|r| r["id"].as_u64() == Some(id))
                {
                    return Ok(Value::Null);
                }
            }
        }
        self.api_page(method, endpoint, body)
    }

    fn job_logs(&self, repository: &str, job_id: u64, step_index: Option<usize>) -> Result<String> {
        let endpoint = match step_index {
            Some(index) => format!("/repos/{repository}/actions/jobs/{job_id}/steps/{index}/logs"),
            None => format!("/repos/{repository}/actions/jobs/{job_id}/logs"),
        };
        let mut command = Command::new(&self.gh);
        command
            .args([
                "api",
                "--hostname",
                "github.com",
                "--method",
                "GET",
                "-H",
                "Accept: application/vnd.github+json",
                "-H",
                "X-GitHub-Api-Version: 2026-03-10",
                &endpoint,
            ])
            .env("GH_PROMPT_DISABLED", "1")
            .env("GH_PAGER", "cat")
            .env_remove("GH_DEBUG")
            .env_remove("DEBUG");
        download_log(&mut command)
    }

    fn step_log_fallback(&self, repository: &str, job_id: u64, run_attempt: u64) -> Result<String> {
        // gh caches its downloaded archive. Isolate that cache and remove it after this request.
        let cache = tempfile::tempdir().context("Could not create a temporary log cache")?;
        let mut command = Command::new(&self.gh);
        command
            .args([
                "run",
                "view",
                "--repo",
                repository,
                "--job",
                &job_id.to_string(),
                "--attempt",
                &run_attempt.to_string(),
                "--log",
            ])
            .env("XDG_CACHE_HOME", cache.path())
            .env("GH_HOST", "github.com");
        download_log(&mut command)
    }

    fn prepare(&self, r: &Runner) -> Result<String> {
        ensure!(
            cfg!(target_os = "macos"),
            "This release supports macOS only"
        );
        let arch = match std::env::consts::ARCH {
            "aarch64" => "arm64",
            "x86_64" => "x64",
            _ => bail!("Unsupported Mac architecture"),
        };
        let release = match self.api("GET", "/repos/actions/runner/releases/latest", None) {
            Ok(release) => release,
            Err(_) => {
                // Public release metadata does not require a GitHub account.
                let text = checked(
                    Command::new("/usr/bin/curl").args([
                        "--fail",
                        "--silent",
                        "--show-error",
                        "--proto",
                        "=https",
                        "--connect-timeout",
                        "15",
                        "--max-time",
                        "45",
                        "-H",
                        "Accept: application/vnd.github+json",
                        "https://api.github.com/repos/actions/runner/releases/latest",
                    ]),
                    50,
                )?;
                serde_json::from_str(&text).context("Invalid official runner release metadata")?
            }
        };
        let version = release["tag_name"]
            .as_str()
            .context("Runner release has no version")?
            .trim_start_matches('v')
            .to_string();
        ensure!(
            version.bytes().all(|c| c.is_ascii_digit() || c == b'.'),
            "Invalid runner version"
        );
        let filename = format!("actions-runner-osx-{arch}-{version}.tar.gz");
        let asset = release["assets"]
            .as_array()
            .context("Release has no assets")?
            .iter()
            .find(|a| a["name"].as_str() == Some(&filename))
            .context("Official runner package is unavailable for this Mac")?;
        let url = asset["browser_download_url"]
            .as_str()
            .context("Missing runner download URL")?;
        ensure!(
            url.starts_with("https://github.com/actions/runner/releases/download/"),
            "Unexpected runner download origin"
        );
        let digest = asset["digest"]
            .as_str()
            .and_then(|s| s.strip_prefix("sha256:"))
            .context("Official release has no SHA-256 digest; refusing an unverified download")?;
        ensure!(
            digest.len() == 64 && digest.bytes().all(|c| c.is_ascii_hexdigit()),
            "Invalid runner checksum"
        );
        let cache = self.root.join("downloads");
        fs::create_dir_all(&cache)?;
        let archive = cache.join(&filename);
        if !archive.exists() || Self::checksum(&archive)? != digest {
            let partial = archive.with_extension("partial");
            checked(
                Command::new("/usr/bin/curl")
                    .args([
                        "--fail",
                        "--location",
                        "--silent",
                        "--show-error",
                        "--proto",
                        "=https",
                        "--proto-redir",
                        "=https",
                        "--connect-timeout",
                        "15",
                        "--max-time",
                        "600",
                        "--output",
                    ])
                    .arg(&partial)
                    .arg(url),
                610,
            )?;
            ensure!(
                Self::checksum(&partial)? == digest,
                "Runner archive checksum mismatch; the archive was not installed"
            );
            fs::rename(&partial, &archive)?;
        }
        checked(
            Command::new("/usr/bin/tar")
                .arg("-xzf")
                .arg(&archive)
                .arg("-C")
                .arg(&r.path),
            120,
        )?;
        Ok(version)
    }

    fn registration_token(&self, target: &crate::core::Target) -> Result<Option<String>> {
        let response = self.api(
            "POST",
            &format!("{}/registration-token", target.api()),
            None,
        )?;
        let token = response["token"]
            .as_str()
            .context("GitHub returned no registration token")?;
        Ok(Some(token.to_string()))
    }

    fn configure(&self, r: &Runner) -> Result<u64> {
        let token = self
            .registration_token(&r.target)?
            .context("Missing registration token")?;
        self.configure_with_token(r, &token)
    }

    fn configure_with_token(&self, r: &Runner, token: &str) -> Result<u64> {
        let mut cmd = self.script(
            r,
            "config.sh",
            &[
                "--unattended",
                "--url",
                &r.target.url(),
                "--name",
                &r.name,
                "--work",
                "_work",
            ],
        );
        if !r.labels.is_empty() {
            cmd.args(["--labels", &r.labels.join(",")]);
        }
        cmd.env("ACTIONS_RUNNER_INPUT_TOKEN", token);
        let result = checked(&mut cmd, 180)
            .map_err(|e| anyhow::anyhow!(e.to_string().replace(token, "[redacted]")));
        result?;
        self.recover_registration(r)?
            .context("Configuration completed without a readable .runner identity")
    }

    fn recover_registration(&self, r: &Runner) -> Result<Option<u64>> {
        let path = r.path.join(".runner");
        if !path.exists() {
            return Ok(None);
        }
        // The official runner writes .runner with a UTF-8 BOM on some versions.
        let bytes = fs::read(path)?;
        let data: Value =
            serde_json::from_slice(bytes.strip_prefix(b"\xef\xbb\xbf").unwrap_or(&bytes))
                .context("Could not parse the local .runner identity")?;
        ensure!(
            data["agentName"].as_str() == Some(&r.name),
            "Local registration name does not match the managed record"
        );
        if let Some(url) = data["gitHubUrl"].as_str() {
            ensure!(
                url.trim_end_matches('/')
                    .eq_ignore_ascii_case(&r.target.url()),
                "Local registration target differs from the managed record"
            );
        }
        Ok(Some(
            data["agentId"]
                .as_u64()
                .context("Invalid local registration ID")?,
        ))
    }

    fn install_service(&self, r: &Runner) -> Result<()> {
        if self.service(r)?.is_none() {
            checked(&mut self.script(r, "svc.sh", &["install"]), 30)?;
        }
        let (path, label) = self
            .service(r)?
            .context("Official service installation did not produce .service")?;
        fs::write(r.path.join(".service"), format!("{}\n", path.display()))?;
        if !r.path.join("runsvc.sh").is_file() {
            fs::copy(r.path.join("bin/runsvc.sh"), r.path.join("runsvc.sh"))?;
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(r.path.join("runsvc.sh"), fs::Permissions::from_mode(0o755))?;
        }
        let mut value = plist::Value::from_file(&path)?;
        let dict = value.as_dictionary_mut().context("Invalid service plist")?;
        let logs = r.path.join("logs");
        fs::create_dir_all(&logs)?;
        let old_log = dict
            .get("StandardOutPath")
            .and_then(plist::Value::as_string)
            .map(PathBuf::from);
        dict.insert(
            "StandardOutPath".into(),
            plist::Value::String(logs.join("stdout.log").to_string_lossy().into_owned()),
        );
        dict.insert(
            "StandardErrorPath".into(),
            plist::Value::String(logs.join("stderr.log").to_string_lossy().into_owned()),
        );
        dict.insert("ExitTimeOut".into(), plist::Value::Integer(45u64.into()));
        dict.insert("RunAtLoad".into(), plist::Value::Boolean(true));
        if !dict.contains_key("EnvironmentVariables") {
            dict.insert(
                "EnvironmentVariables".into(),
                plist::Value::Dictionary(Default::default()),
            );
        }
        let env = dict
            .get_mut("EnvironmentVariables")
            .and_then(plist::Value::as_dictionary_mut)
            .context("Invalid service environment")?;
        env.insert(
            "PATH".into(),
            plist::Value::String(
                std::env::var("PATH").unwrap_or_else(|_| "/usr/bin:/bin:/usr/sbin:/sbin".into()),
            ),
        );
        let tmp = path.with_extension("plist.tmp");
        value.to_file_xml(&tmp)?;
        fs::rename(tmp, &path)?;
        // svc.sh creates this directory even though logs are centralized. Remove only if empty.
        if let Some(dir) = old_log.as_deref().and_then(Path::parent) {
            let original_logs = PathBuf::from(std::env::var_os("HOME").context("HOME missing")?)
                .join("Library/Logs")
                .join(label);
            if dir == original_logs && dir != logs {
                let _ = fs::remove_dir(dir);
            }
        }
        Ok(())
    }

    fn start(&self, r: &Runner) -> Result<()> {
        let (_, label) = self
            .service(r)?
            .context("Runner service is not installed")?;
        checked(
            Command::new("/bin/launchctl").args(["enable", &Self::service_target(&label)]),
            10,
        )?;
        if self.service_info(&label)?.is_none() {
            checked(&mut self.script(r, "svc.sh", &["start"]), 30)?;
        } else {
            checked(
                Command::new("/bin/launchctl").args(["kickstart", &Self::service_target(&label)]),
                30,
            )?;
        }
        let begin = Instant::now();
        while begin.elapsed() < Duration::from_secs(15) {
            if self
                .service_info(&label)?
                .is_some_and(|s| service_pid(&s).is_some())
            {
                return Ok(());
            }
            thread::sleep(Duration::from_millis(250));
        }
        bail!("Service did not start a process. Inspect the runner's logs directory; GitHub connectivity is checked separately")
    }

    fn stop(&self, r: &Runner) -> Result<()> {
        let service = self.service(r)?;
        let info = service
            .as_ref()
            .map(|(_, label)| self.service_info(label))
            .transpose()?
            .flatten();
        let tracked = self.process_tree(r, info.as_deref().and_then(service_pid))?;
        if let Some((_, label)) = &service {
            checked(
                Command::new("/bin/launchctl").args(["disable", &Self::service_target(label)]),
                10,
            )?;
            if info.is_some() {
                checked(&mut self.script(r, "svc.sh", &["stop"]), 60)?;
            }
        }
        let begin = Instant::now();
        loop {
            let loaded = if let Some((_, label)) = &service {
                self.service_info(label)?.is_some()
            } else {
                false
            };
            let remaining = self.process_tree(r, None)?;
            let mut alive = !remaining.is_empty();
            for (pid, identity) in &tracked {
                let output = run(
                    Command::new("/bin/ps").args(["-p", &pid.to_string(), "-o", "lstart="]),
                    None,
                    Duration::from_secs(5),
                )?;
                if output.ok
                    && output.text.split_whitespace().collect::<Vec<_>>().join(" ") == *identity
                {
                    alive = true;
                }
            }
            if !loaded && !alive {
                return Ok(());
            }
            ensure!(begin.elapsed() < Duration::from_secs(60), "Runner processes have not exited. Files and registration are preserved; inspect the service and retry stop");
            thread::sleep(Duration::from_millis(250));
        }
    }

    fn remove_service(&self, r: &Runner) -> Result<()> {
        if let Some((path, label)) = self.service(r)? {
            ensure!(
                self.service_info(&label)?.is_none(),
                "Refusing to remove a loaded service"
            );
            // Official uninstall calls stop again and fails on an already unloaded service.
            // At this point stop and deregistration have succeeded, so remove its exact plist.
            fs::remove_file(path)?;
            let _ = fs::remove_file(r.path.join(".service"));
        }
        Ok(())
    }

    fn local_status(&self, r: &Runner) -> Result<String> {
        if let Some((_, label)) = self.service(r)? {
            if let Some(info) = self.service_info(&label)? {
                return Ok(if service_pid(&info).is_some() {
                    "running"
                } else {
                    "loaded_without_process"
                }
                .into());
            }
        }
        Ok(if self.process_tree(r, None)?.is_empty() {
            "stopped"
        } else {
            "unmanaged_process"
        }
        .into())
    }
}
