use crate::core::{Backend, Runner};
use anyhow::{bail, ensure, Context, Result};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs::{self, File},
    io::{Read, Write},
    os::unix::process::CommandExt,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

pub struct Native {
    pub root: PathBuf,
    pub gh: PathBuf,
}
struct Output {
    ok: bool,
    text: String,
    truncated: bool,
}

// Drain both pipes even after the retained output limit, avoiding deadlock and unbounded RAM.
fn read_limited(mut pipe: impl Read, limit: usize) -> std::io::Result<(Vec<u8>, bool)> {
    let mut retained = Vec::new();
    let mut truncated = false;
    let mut buffer = [0; 8192];
    loop {
        let n = pipe.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        let keep = n.min(limit.saturating_sub(retained.len()));
        truncated |= keep < n;
        retained.extend_from_slice(&buffer[..keep]);
    }
    Ok((retained, truncated))
}

fn run(command: &mut Command, input: Option<&[u8]>, timeout: Duration) -> Result<Output> {
    run_with_limit(command, input, timeout, 2 * 1024 * 1024)
}

fn run_with_limit(
    command: &mut Command,
    input: Option<&[u8]>,
    timeout: Duration,
    output_limit: usize,
) -> Result<Output> {
    command
        .stdin(if input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .process_group(0);
    let mut child = command.spawn().with_context(|| {
        format!(
            "Could not launch management command {}",
            command.get_program().to_string_lossy()
        )
    })?;
    let stdout = child.stdout.take().context("Missing stdout")?;
    let stderr = child.stderr.take().context("Missing stderr")?;
    let out = thread::spawn(move || read_limited(stdout, output_limit));
    let err = thread::spawn(move || read_limited(stderr, 2 * 1024 * 1024));
    if let Some(input) = input {
        let result = child
            .stdin
            .take()
            .context("Missing stdin")?
            .write_all(input);
        if result.is_err() {
            let _ = child.kill();
        }
    }
    let begin = Instant::now();
    let (status, timed_out) = loop {
        if let Some(status) = child.try_wait()? {
            break (status, false);
        }
        if begin.elapsed() > timeout {
            // This group contains only the transient management command, never a launchd service.
            unsafe {
                libc::kill(-(child.id() as i32), libc::SIGKILL);
            }
            break (child.wait()?, true);
        }
        thread::sleep(Duration::from_millis(50));
    };
    let (stdout, out_truncated) = out
        .join()
        .map_err(|_| anyhow::anyhow!("Output reader failed"))??;
    let (stderr, err_truncated) = err
        .join()
        .map_err(|_| anyhow::anyhow!("Error reader failed"))??;
    ensure!(
        !timed_out,
        "Management command timed out; inspect the saved runner state before retrying"
    );
    let mut text = String::from_utf8_lossy(&stdout).into_owned();
    if !status.success() {
        text.push_str(&String::from_utf8_lossy(&stderr));
    }
    Ok(Output {
        ok: status.success(),
        text,
        truncated: out_truncated || (!status.success() && err_truncated),
    })
}
fn checked(command: &mut Command, timeout: u64) -> Result<String> {
    let output = run(command, None, Duration::from_secs(timeout))?;
    ensure!(output.ok, "{}", output.text.trim());
    Ok(output.text)
}

fn download_log(command: &mut Command) -> Result<String> {
    command
        .env("GH_PROMPT_DISABLED", "1")
        .env("GH_PAGER", "cat")
        .env("NO_COLOR", "1")
        .env("CLICOLOR", "0")
        .env_remove("GH_FORCE_TTY")
        .env_remove("GH_DEBUG")
        .env_remove("DEBUG");
    // gh follows GitHub's short-lived download redirect. Logs are never persisted.
    // Keep memory bounded, but never present a retained prefix as a complete log.
    let output = run_with_limit(command, None, Duration::from_secs(90), 16 * 1024 * 1024)
        .context("Could not download GitHub logs. Open the job on GitHub or retry")?;
    if !output.ok {
        if output.text.contains("is still in progress") {
            bail!("GitHub has not published this step's archive because its workflow is still running. Open the complete job log or view live output on GitHub");
        }
        if output.text.contains("HTTP 404") || output.text.contains("HTTP 410") {
            bail!("GitHub has not published this log or it has expired. Open the job on GitHub or retry later");
        }
        if output.text.contains("HTTP 401") || output.text.contains("gh auth login") {
            bail!("GitHub authentication is missing or expired. Sign in again to download logs");
        }
        if output.text.contains("HTTP 403")
            || output.text.contains("SAML")
            || output.text.contains("SSO")
        {
            bail!("GitHub denied log access. Check Actions read permission, organization SSO, and API rate limits");
        }
        // Do not expose raw CLI output: a failed response can contain a signed URL or log data.
        bail!("GitHub log download failed. Check connectivity and Actions read permission, or open the job on GitHub");
    }
    ensure!(
        !output.truncated,
        "This log exceeds the 16 MiB inline viewing limit. Open the job on GitHub to view or download the complete log"
    );
    Ok(output.text)
}

pub fn find_gh() -> Result<PathBuf> {
    let exe = std::env::current_exe()?;
    if let Some(dir) = exe.parent() {
        let bundled = dir.join("libexec/gh");
        if bundled.is_file() {
            return Ok(bundled);
        }
    }
    for dir in std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default()) {
        let path = dir.join("gh");
        if path.is_file() {
            return Ok(path);
        }
    }
    // GUI-launched processes may not inherit the user's Homebrew PATH.
    for executable in ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"] {
        let path = PathBuf::from(executable);
        if path.is_file() {
            return Ok(path);
        }
    }
    bail!("GitHub CLI is missing. Install gh or use the complete mactions release bundle, which includes gh")
}

pub fn default_root() -> Result<PathBuf> {
    let home = PathBuf::from(std::env::var_os("HOME").context("HOME is not set")?);
    let root = home.join(".mactions");
    let legacy = home.join("Library/Application Support/mactions");
    // Keep existing installations manageable until their services are migrated.
    if !root.exists() && legacy.join("records").is_dir() {
        return Ok(legacy);
    }
    Ok(root)
}

impl Native {
    fn api_page(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        let mut command = Command::new(&self.gh);
        command.args([
            "api",
            "--hostname",
            "github.com",
            "--method",
            method,
            "-H",
            "Accept: application/vnd.github+json",
            "-H",
            "X-GitHub-Api-Version: 2022-11-28",
            endpoint,
        ]);
        command
            .env("GH_PROMPT_DISABLED", "1")
            .env("GH_PAGER", "cat");
        let bytes = body.map(|b| serde_json::to_vec(&b)).transpose()?;
        if bytes.is_some() {
            command.args(["--input", "-"]);
        }
        let output = run(&mut command, bytes.as_deref(), Duration::from_secs(45))?;
        if !output.ok {
            if output.text.contains("HTTP 401")
                || output.text.contains("gh auth login")
                || output.text.contains("GH_TOKEN")
            {
                bail!("GitHub authentication is missing or expired. Run `mactions auth login` on this Mac");
            }
            if output.text.contains("SAML") || output.text.contains("SSO") {
                bail!("GitHub requires SSO authorization. Sign in to your organization on GitHub, authorize GitHub CLI, then check again");
            }
            if output.text.contains("OAuth App access restrictions")
                || output.text.contains("organization approval")
            {
                bail!("Organization approval is required. Ask an organization owner to approve GitHub CLI, then check again");
            }
            if output.text.contains("HTTP 403") || output.text.contains("HTTP 404") {
                // A 404 can hide an inaccessible repository; it is never sufficient proof of deletion.
                bail!("GitHub denied access or could not find the target. Check the target and runner administration permissions (repository Administration or organization Self-hosted runners). SSO or organization approval may also be required");
            }
            bail!("GitHub request failed. Check connectivity, API rate limits, and authorization, then retry");
        }
        if output.text.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&output.text).context("GitHub returned invalid or oversized JSON")
    }

    fn script(&self, r: &Runner, script: &str, args: &[&str]) -> Command {
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

    fn service(&self, r: &Runner) -> Result<Option<(PathBuf, String)>> {
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

    fn service_target(label: &str) -> String {
        format!("gui/{}/{label}", unsafe { libc::getuid() })
    }
    fn service_info(&self, label: &str) -> Result<Option<String>> {
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

    fn process_tree(&self, r: &Runner, service_pid: Option<i32>) -> Result<Vec<(i32, String)>> {
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

fn service_pid(text: &str) -> Option<i32> {
    text.lines()
        .find_map(|line| {
            line.trim()
                .strip_prefix("pid = ")
                .and_then(|s| s.parse().ok())
        })
        .filter(|pid| *pid > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;
    use tempfile::TempDir;

    fn fixture(script: &str) -> (TempDir, Native) {
        let root = TempDir::new().unwrap();
        let gh = root.path().join("gh");
        fs::write(
            &gh,
            format!(
                "#!/bin/bash\nset -eu\ncd '{}'\n{script}\n",
                root.path().display()
            ),
        )
        .unwrap();
        fs::set_permissions(&gh, fs::Permissions::from_mode(0o755)).unwrap();
        let native = Native {
            root: root.path().into(),
            gh,
        };
        (root, native)
    }
    #[test]
    fn all_pages_are_used_for_name_and_identity_lookup() {
        let (root, native) = fixture("printf '%s\\n' \"$*\" >> requests\ncase \"${!#}\" in *page=1) cat page1.json;; *) cat page2.json;; esac");
        fs::write(
            root.path().join("page1.json"),
            json!({"runners":(0..100).map(|id|json!({"id":id})).collect::<Vec<_>>()} ).to_string(),
        )
        .unwrap();
        fs::write(
            root.path().join("page2.json"),
            json!({"runners":[{"id":101,"name":"last-page"}]}).to_string(),
        )
        .unwrap();
        let result = native
            .api("GET", "/orgs/example/actions/runners?per_page=100", None)
            .unwrap();
        assert_eq!(result["runners"].as_array().unwrap().len(), 101);
        assert_eq!(result["runners"][100]["name"], "last-page");
    }
    #[test]
    fn inaccessible_target_does_not_count_as_successful_deregistration() {
        let (_root, native) = fixture("echo 'HTTP 404: Not Found' >&2; exit 1");
        assert!(native
            .api("DELETE", "/repos/example/build/actions/runners/42", None)
            .unwrap_err()
            .to_string()
            .contains("permissions"));
    }
    #[test]
    fn deletion_is_idempotent_only_after_an_authenticated_list() {
        let (root, native) = fixture("printf '%s\\n' \"$*\" >> requests\necho '{\"runners\":[]}'");
        native
            .api("DELETE", "/repos/example/build/actions/runners/42", None)
            .unwrap();
        let requests = fs::read_to_string(root.path().join("requests")).unwrap();
        assert!(requests.contains("--method GET"));
        assert!(!requests.contains("--method DELETE"));
    }
    #[test]
    fn recovers_official_runner_identity_with_utf8_bom() {
        let (root, native) = fixture("exit 0");
        let path = root.path().join("actions-runner-1");
        fs::create_dir(&path).unwrap();
        let runner = Runner {
            id: 1,
            name: "fixture-1".into(),
            target: crate::core::Target::new("repo", "example/build").unwrap(),
            labels: vec![],
            path,
            version: None,
            github_id: None,
            enabled: false,
            phase: "registering".into(),
            error: None,
            deregistered: false,
            registration_attempted: true,
        };
        for prefix in ["\u{feff}", ""] {
            fs::write(runner.path.join(".runner"), format!("{}{}", prefix, r#"{"agentId":42,"agentName":"fixture-1","gitHubUrl":"https://github.com/example/build"}"#)).unwrap();
            assert_eq!(native.recover_registration(&runner).unwrap(), Some(42));
        }
    }
    #[test]
    fn configuration_errors_redact_registration_tokens() {
        let (root, native) = fixture("echo '{\"token\":\"secret-fixture-token\"}'");
        let path = root.path().join("actions-runner-1");
        fs::create_dir(&path).unwrap();
        fs::write(
            path.join("config.sh"),
            "#!/bin/bash\nprintf '%s' \"$ACTIONS_RUNNER_INPUT_TOKEN\"\nexit 1\n",
        )
        .unwrap();
        fs::set_permissions(path.join("config.sh"), fs::Permissions::from_mode(0o755)).unwrap();
        let runner = Runner {
            id: 1,
            name: "fixture-1".into(),
            target: crate::core::Target::new("repo", "example/build").unwrap(),
            labels: vec![],
            path,
            version: None,
            github_id: None,
            enabled: false,
            phase: "registering".into(),
            error: None,
            deregistered: false,
            registration_attempted: true,
        };
        let error = native.configure(&runner).unwrap_err().to_string();
        assert!(error.contains("[redacted]"));
        assert!(!error.contains("secret-fixture-token"));
    }
    #[test]
    fn output_capture_is_bounded_without_blocking_the_child() {
        let result = checked(
            Command::new("/bin/sh").args(["-c", "yes fixture | head -c 3000000"]),
            10,
        )
        .unwrap();
        assert_eq!(result.len(), 2 * 1024 * 1024);
    }

    #[test]
    fn job_log_downloads_exceed_management_cap_but_never_silently_truncate() {
        let (_root, native) = fixture("yes fixture | head -c 3000000");
        assert_eq!(
            native.job_logs("example/build", 70, None).unwrap().len(),
            3_000_000
        );
        let (_root, native) = fixture("yes fixture | head -c 17000000");
        let error = native
            .job_logs("example/build", 70, Some(0))
            .unwrap_err()
            .to_string();
        assert!(error.contains("16 MiB"));
        assert!(error.contains("complete log"));
        assert!(!error.contains("fixture"));
    }

    #[test]
    fn log_download_failure_never_exposes_raw_cli_output() {
        let (_root, native) =
            fixture("echo 'private-output signed-download-url'; echo 'HTTP 403' >&2; exit 1");
        let error = native
            .job_logs("example/build", 70, None)
            .unwrap_err()
            .to_string();
        assert!(error.contains("Actions read permission"));
        assert!(!error.contains("private-output"));
        assert!(!error.contains("signed-download-url"));
    }

    #[test]
    fn step_fallback_isolates_and_removes_the_cli_archive_cache() {
        let (root, native) = fixture("printf '%s' \"$XDG_CACHE_HOME\" > cache-path\nprintf '%s' \"$*\" > arguments\nprintf 'archive' > \"$XDG_CACHE_HOME/private-log\"\nprintf 'Build\\tTests\\toutput\\n'");
        assert_eq!(
            native.step_log_fallback("example/build", 70, 2).unwrap(),
            "Build\tTests\toutput\n"
        );
        let cache = fs::read_to_string(root.path().join("cache-path")).unwrap();
        assert!(!Path::new(&cache).exists());
        let args = fs::read_to_string(root.path().join("arguments")).unwrap();
        assert!(args.contains("--attempt 2"));
    }
}
