use anyhow::{bail, ensure, Context, Result};
use fs2::FileExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    os::unix::fs::PermissionsExt,
    path::PathBuf,
    sync::Arc,
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Target {
    pub kind: String,
    pub name: String,
}
impl Target {
    pub fn new(kind: &str, name: &str) -> Result<Self> {
        ensure!(
            kind == "repo" || kind == "org",
            "Target kind must be repo or org"
        );
        let name = name
            .trim()
            .trim_start_matches("https://github.com/")
            .trim_end_matches('/');
        let parts: Vec<_> = name.split('/').collect();
        ensure!(
            parts.len() == if kind == "repo" { 2 } else { 1 },
            "Use owner/repository for a repo or an organization name for an org"
        );
        ensure!(
            parts.iter().all(|s| !s.is_empty()
                && *s != "."
                && *s != ".."
                && s.len() <= 100
                && s.bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"-_.".contains(&c))),
            "Invalid GitHub target"
        );
        Ok(Self {
            kind: kind.into(),
            name: name.into(),
        })
    }
    pub fn api(&self) -> String {
        format!(
            "/{}/{}/actions/runners",
            if self.kind == "repo" { "repos" } else { "orgs" },
            self.name
        )
    }
    pub fn url(&self) -> String {
        format!("https://github.com/{}", self.name)
    }
}

pub fn labels(input: &[String]) -> Result<Vec<String>> {
    let mut result = Vec::<String>::new();
    ensure!(
        input.len() <= 100,
        "At most 100 custom labels are supported"
    );
    for item in input {
        let item = item.trim();
        ensure!(
            !item.is_empty()
                && item.len() <= 100
                && !item.contains(',')
                && !item.chars().any(char::is_control),
            "Labels must contain 1–100 bytes, without commas or control characters"
        );
        ensure!(
            ![
                "self-hosted",
                "macos",
                "linux",
                "windows",
                "arm",
                "arm64",
                "x64"
            ]
            .iter()
            .any(|s| item.eq_ignore_ascii_case(s)),
            "GitHub default labels are read-only: {item}"
        );
        if !result.iter().any(|s| s.eq_ignore_ascii_case(item)) {
            result.push(item.to_owned());
        }
    }
    Ok(result)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Runner {
    pub id: u64,
    pub name: String,
    pub target: Target,
    pub labels: Vec<String>,
    pub path: PathBuf,
    pub version: Option<String>,
    pub github_id: Option<u64>,
    pub enabled: bool,
    pub phase: String,
    pub error: Option<String>,
    #[serde(default)]
    pub deregistered: bool,
    #[serde(default)]
    pub registration_attempted: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Create {
    pub kind: String,
    pub target: String,
    #[serde(default = "default_prefix")]
    pub prefix: String,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub registration_token: Option<String>,
}
fn default_prefix() -> String {
    "mactions".into()
}

pub trait Backend: Send + Sync {
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value>;
    fn job_logs(
        &self,
        _repository: &str,
        _job_id: u64,
        _step_index: Option<usize>,
    ) -> Result<String> {
        bail!("GitHub job log downloads are unavailable")
    }
    fn step_log_fallback(
        &self,
        _repository: &str,
        _job_id: u64,
        _run_attempt: u64,
    ) -> Result<String> {
        bail!("GitHub step log fallback is unavailable")
    }
    fn prepare(&self, runner: &Runner) -> Result<String>;
    fn configure(&self, runner: &Runner) -> Result<u64>;
    fn registration_token(&self, _target: &Target) -> Result<Option<String>> {
        Ok(None)
    }
    fn configure_with_token(&self, _runner: &Runner, _token: &str) -> Result<u64> {
        bail!("Registration token configuration is unavailable")
    }
    fn github_cli(&self) -> Option<PathBuf> {
        None
    }
    fn recover_registration(&self, runner: &Runner) -> Result<Option<u64>>;
    fn install_service(&self, runner: &Runner) -> Result<()>;
    fn start(&self, runner: &Runner) -> Result<()>;
    fn stop(&self, runner: &Runner) -> Result<()>;
    fn remove_service(&self, runner: &Runner) -> Result<()>;
    fn local_status(&self, runner: &Runner) -> Result<String>;
}

pub struct Manager {
    pub root: PathBuf,
    pub(crate) backend: Arc<dyn Backend>,
}
impl Manager {
    pub fn new(root: PathBuf, backend: Arc<dyn Backend>) -> Result<Self> {
        fs::create_dir_all(&root)?;
        let root = root.canonicalize()?;
        ensure!(!root.to_string_lossy().chars().any(|c| c.is_control() || "&<>@\\".contains(c)), "Official macOS runner service scripts cannot safely substitute this data path. Use a path without &, <, >, @, backslashes, or control characters");
        fs::set_permissions(&root, fs::Permissions::from_mode(0o700))?;
        fs::create_dir_all(root.join("records"))?;
        Ok(Self { root, backend })
    }
    fn lock(&self) -> Result<File> {
        let f = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(self.root.join("manager.lock"))?;
        f.try_lock_exclusive()
            .context("Another management operation is running. Wait for it to finish and retry")?;
        Ok(f)
    }
    fn record_path(&self, id: u64) -> PathBuf {
        self.root.join("records").join(format!("{id}.json"))
    }
    pub fn save(&self, runner: &Runner) -> Result<()> {
        let target = self.record_path(runner.id);
        let temp = target.with_extension("tmp");
        let mut file = File::create(&temp)?;
        file.write_all(&serde_json::to_vec_pretty(runner)?)?;
        file.sync_all()?;
        fs::rename(temp, target)?;
        File::open(self.root.join("records"))?.sync_all()?;
        Ok(())
    }
    pub fn get(&self, id: u64) -> Result<Runner> {
        let runner: Runner = serde_json::from_slice(
            &fs::read(self.record_path(id))
                .with_context(|| format!("Managed runner {id} does not exist"))?,
        )?;
        ensure!(
            runner.id == id && runner.path == self.root.join(format!("actions-runner-{id}")),
            "Managed runner metadata has an invalid path or ID"
        );
        if let Ok(meta) = fs::symlink_metadata(&runner.path) {
            ensure!(
                meta.is_dir() && !meta.file_type().is_symlink(),
                "Runner path must be a real managed directory"
            );
        }
        Ok(runner)
    }
    pub fn records(&self) -> Result<Vec<Runner>> {
        let mut runners = vec![];
        for entry in fs::read_dir(self.root.join("records"))? {
            let path = entry?.path();
            if path.extension().is_some_and(|s| s == "json") {
                let id = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .context("Invalid record filename")?
                    .parse()?;
                runners.push(self.get(id)?);
            }
        }
        runners.sort_by_key(|r| r.id);
        Ok(runners)
    }
    pub fn list(&self, remote: bool) -> Result<Value> {
        let records = self.records()?;
        let mut targets =
            std::collections::HashMap::<String, std::result::Result<Value, String>>::new();
        let mut rows = vec![];
        let operation_running = self.lock().is_err();
        for r in records {
            let local = self.backend.local_status(&r);
            let mut row = serde_json::to_value(&r)?;
            row["local_status"] = json!(local.as_ref().map(String::as_str).unwrap_or("unknown"));
            if let Err(e) = local {
                row["local_error"] = json!(e.to_string());
            }
            row["github_status"] = json!("unknown");
            row["busy"] = Value::Null;
            if remote && r.github_id.is_some() && !r.deregistered {
                let key = r.target.api();
                let response = targets.entry(key.clone()).or_insert_with(|| {
                    self.backend
                        .api("GET", &format!("{key}?per_page=100"), None)
                        .map_err(|e| e.to_string())
                });
                match response {
                    Ok(data) => {
                        if let Some(found) = data["runners"]
                            .as_array()
                            .and_then(|rs| rs.iter().find(|v| v["id"].as_u64() == r.github_id))
                        {
                            row["github_status"] = found["status"].clone();
                            row["busy"] = found["busy"].clone();
                            row["github_labels"] = found["labels"].clone();
                        } else {
                            row["github_status"] = json!("not_registered");
                        }
                    }
                    Err(e) => row["github_error"] = json!(e),
                }
            }
            row["interrupted"] = json!(
                !operation_running && !["ready", "stopped", "failed"].contains(&r.phase.as_str())
            );
            rows.push(row);
        }
        Ok(
            json!({"runners":rows, "operation_running":operation_running, "data_directory": self.root}),
        )
    }
    fn phase(&self, r: &mut Runner, phase: &str) -> Result<()> {
        r.phase = phase.into();
        r.error = None;
        self.save(r)
    }
    fn finish<T>(&self, r: &mut Runner, result: Result<T>) -> Result<T> {
        if let Err(e) = &result {
            r.phase = "failed".into();
            r.error = Some(format!("{e:#}"));
            self.save(r)?;
        }
        result
    }
    fn recover(&self, r: &mut Runner) -> Result<()> {
        if r.github_id.is_none() && !r.deregistered {
            r.github_id = self.backend.recover_registration(r)?;
            if r.github_id.is_none() && r.registration_attempted {
                let remote =
                    self.backend
                        .api("GET", &format!("{}?per_page=100", r.target.api()), None)?;
                ensure!(!remote["runners"].as_array().context("Invalid GitHub runner list")?.iter().any(|item| item["name"].as_str().is_some_and(|name| name.eq_ignore_ascii_case(&r.name))), "A remote runner matches this name but its local identity is missing. Files are preserved; inspect the registration on GitHub before retrying");
                // An authenticated list proves that no matching registration remains.
                r.registration_attempted = false;
            }
            self.save(r)?;
        }
        Ok(())
    }
    pub fn create(&self, request: Create) -> Result<Runner> {
        ensure!(
            !self.root.to_string_lossy().chars().any(char::is_whitespace),
            "GitHub runner shell scripts require a data path without whitespace. Use --data-dir with a whitespace-free path; existing services must be migrated before moving their files"
        );
        let target = Target::new(&request.kind, &request.target)?;
        let custom = labels(&request.labels)?;
        ensure!(
            !request.prefix.is_empty()
                && request.prefix.len() <= 48
                && request
                    .prefix
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"-_".contains(&b)),
            "Name prefix must contain 1–48 letters, digits, hyphens, or underscores"
        );
        let _lock = self.lock()?;
        let mut max = 0;
        for entry in fs::read_dir(&self.root)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if name == "actions-runner" {
                max = max.max(1);
            }
            if let Some(n) = name
                .strip_prefix("actions-runner-")
                .and_then(|s| s.parse::<u64>().ok())
            {
                max = max.max(n);
            }
        }
        // Surviving recovery records also reserve their identities.
        for r in self.records()? {
            max = max.max(r.id);
        }
        let id = max.checked_add(1).context("Runner index exhausted")?;
        let name = format!("{}-{id}", request.prefix);
        if request.registration_token.is_none() {
            let existing =
                self.backend
                    .api("GET", &format!("{}?per_page=100", target.api()), None)?;
            ensure!(
                !existing["runners"]
                    .as_array()
                    .context("Invalid GitHub runner list")?
                    .iter()
                    .any(|r| r["name"]
                        .as_str()
                        .is_some_and(|n| n.eq_ignore_ascii_case(&name))),
                "Runner name {name} already exists on GitHub. Choose another prefix"
            );
        }
        if let Some(token) = &request.registration_token {
            validate_token(token)?;
        }
        // Verify automatic registration permission before allocating files or downloading.
        let automatic_token = if request.registration_token.is_none() {
            self.backend.registration_token(&target)?
        } else {
            None
        };
        let token = request
            .registration_token
            .as_deref()
            .or(automatic_token.as_deref());
        let path = self.root.join(format!("actions-runner-{id}"));
        fs::create_dir(&path)?;
        let mut r = Runner {
            id,
            name,
            target,
            labels: custom,
            path,
            version: None,
            github_id: None,
            enabled: false,
            phase: "downloading".into(),
            error: None,
            deregistered: false,
            registration_attempted: false,
        };
        self.save(&r)?;
        let result = self.provision(&mut r, token);
        self.finish(&mut r, result)?;
        Ok(r)
    }
    fn provision(&self, r: &mut Runner, token: Option<&str>) -> Result<()> {
        ensure!(!r.deregistered, "Deletion has begun; retry delete instead");
        self.recover(r)?;
        if r.github_id.is_none() {
            ensure!(!r.registration_attempted, "Registration outcome is uncertain. Inspect the target on GitHub before retrying; delete can recover a matching registration");
            self.phase(r, "downloading")?;
            r.version = Some(self.backend.prepare(r)?);
            r.registration_attempted = true;
            self.phase(r, "registering")?;
            r.github_id = Some(match token {
                Some(token) => self.backend.configure_with_token(r, token)?,
                None => self.backend.configure(r)?,
            });
            self.save(r)?;
        }
        self.phase(r, "installing_service")?;
        self.backend.install_service(r)?;
        self.start_inner(r)
    }
    fn start_inner(&self, r: &mut Runner) -> Result<()> {
        ensure!(
            r.github_id.is_some() && !r.deregistered,
            "Runner is not registered; use retry to finish creation"
        );
        r.enabled = true;
        self.phase(r, "starting")?;
        self.backend.start(r)?;
        self.phase(r, "ready")
    }
    fn stop_inner(&self, r: &mut Runner) -> Result<()> {
        r.enabled = false;
        self.phase(r, "stopping")?;
        self.backend.stop(r)?;
        self.phase(r, "stopped")
    }
    pub fn action(&self, id: u64, action: &str, custom: &[String]) -> Result<Value> {
        self.action_with_token(id, action, custom, None)
    }
    pub fn action_with_token(
        &self,
        id: u64,
        action: &str,
        custom: &[String],
        token: Option<&str>,
    ) -> Result<Value> {
        if let Some(token) = token {
            validate_token(token)?;
        }
        if action == "labels" {
            labels(custom)?;
        }
        ensure!(
            ["start", "stop", "restart", "delete", "labels", "retry"].contains(&action),
            "Unknown action"
        );
        let _lock = self.lock()?;
        let mut r = self.get(id)?;
        let result = (|| {
            match action {
                "retry" => self.provision(&mut r, token)?,
                "start" => {
                    self.recover(&mut r)?;
                    ensure!(r.github_id.is_some() && !r.deregistered, "Runner is not registered or deletion has begun; use retry to finish creation or retry delete");
                    self.backend.install_service(&r)?;
                    self.start_inner(&mut r)?;
                }
                "stop" => self.stop_inner(&mut r)?,
                "restart" => {
                    self.recover(&mut r)?;
                    ensure!(r.github_id.is_some() && !r.deregistered, "Runner is not registered or deletion has begun; use retry to finish creation or retry delete");
                    self.stop_inner(&mut r)?;
                    self.backend.install_service(&r)?;
                    self.start_inner(&mut r)?;
                }
                "labels" => {
                    let custom = labels(custom)?;
                    self.recover(&mut r)?;
                    ensure!(!r.deregistered, "Deletion has begun; retry delete instead");
                    let github_id = r.github_id.context("Runner is not registered")?;
                    self.backend.api(
                        "PUT",
                        &format!("{}/{github_id}/labels", r.target.api()),
                        Some(json!({"labels":custom})),
                    )?;
                    r.labels = custom;
                    let phase = if r.enabled { "ready" } else { "stopped" };
                    self.phase(&mut r, phase)?;
                }
                "delete" => {
                    self.stop_inner(&mut r)?;
                    self.recover(&mut r)?;
                    self.phase(&mut r, "deregistering")?;
                    if !r.deregistered {
                        if let Some(github_id) = r.github_id {
                            self.backend.api(
                                "DELETE",
                                &format!("{}/{github_id}", r.target.api()),
                                None,
                            )?;
                        } else {
                            ensure!(!r.registration_attempted, "Registration outcome is uncertain; local files are preserved. Check GitHub and the local .runner file before retrying deletion");
                        }
                        r.deregistered = true;
                        self.save(&r)?;
                    }
                    self.phase(&mut r, "removing_files")?;
                    self.backend.remove_service(&r)?;
                    if r.path.exists() {
                        fs::remove_dir_all(&r.path)?;
                    }
                    fs::remove_file(self.record_path(id))?;
                    return Ok(json!({"deleted":id}));
                }
                _ => bail!("Unknown action"),
            }
            Ok(serde_json::to_value(&r)?)
        })();
        self.finish(&mut r, result)
    }
}

fn validate_token(token: &str) -> Result<()> {
    ensure!(
        !token.is_empty()
            && token.len() <= 4096
            && !token.chars().any(|c| c.is_whitespace() || c.is_control()),
        "Enter a valid registration token"
    );
    Ok(())
}
