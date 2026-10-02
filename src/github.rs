use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    io::{Read, Write},
    os::unix::process::CommandExt,
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

pub fn connection(manager: &Manager) -> Value {
    match manager.backend.api("GET", "/user", None) {
        Ok(user)
            if user["login"]
                .as_str()
                .is_some_and(|login| !login.trim().is_empty()) =>
        {
            json!({"state":"connected", "connected":true, "login":user["login"], "message":"Using this Mac's GitHub CLI credentials"})
        }
        Ok(_) => {
            json!({"state":"unavailable", "connected":false,"message":"GitHub did not return an account. Check the host's GitHub CLI authentication."})
        }
        Err(error) => {
            let message = error.to_string();
            let state = if message.contains("authentication is missing") {
                "disconnected"
            } else {
                "unavailable"
            };
            json!({"state":state, "connected":false,"message":message})
        }
    }
}

pub fn targets(manager: &Manager, kind: &str, page: u64) -> Result<Value> {
    ensure!((1..=100).contains(&page), "Invalid target page");
    ensure!(
        kind == "repo" || kind == "org",
        "Choose repositories or organizations"
    );
    let endpoint = if kind == "repo" {
        format!("/user/repos?per_page=100&sort=updated&page={page}")
    } else {
        format!("/user/orgs?per_page=100&page={page}")
    };
    let response = manager.backend.api("GET", &endpoint, None)?;
    let rows = response.as_array().context("Invalid GitHub target list")?;
    let items:Vec<Value> = rows.iter().filter_map(|row| {
        let name = row[if kind == "repo" { "full_name" } else { "login" }].as_str()?;
        Some(json!({"kind":kind,"name":name,"private":row["private"].as_bool().unwrap_or(false)}))
    }).collect();
    Ok(
        json!({"items":items,"next_page":if rows.len() == 100 && page < 100 {Some(page + 1)} else {None}}),
    )
}

fn check(result: Result<Value>) -> Value {
    match result {
        Ok(_) => json!({"state":"available"}),
        Err(e) => {
            let message = e.to_string();
            let state = if message.contains("authentication is missing")
                || message.contains("requires SSO")
                || message.contains("Organization approval is required")
            {
                "unavailable"
            } else {
                "unknown"
            };
            json!({"state":state,"message":message})
        }
    }
}
pub fn capabilities(manager: &Manager, target: &Target) -> Value {
    let runners = check(
        manager
            .backend
            .api("GET", &format!("{}?per_page=1", target.api()), None),
    );
    let jobs = if target.kind == "repo" {
        check(manager.backend.api(
            "GET",
            &format!("/repos/{}/actions/runs?per_page=1", target.name),
            None,
        ))
    } else {
        json!({"state":"unknown","message":"Job access is checked for each repository."})
    };
    let mut links = vec![
        json!({"label":"GitHub application access", "url":"https://github.com/settings/applications"}),
        json!({"label":"Open target on GitHub","url":target.url()}),
    ];
    let owner = target.name.split('/').next().unwrap_or("");
    if target.kind == "org" {
        links.push(json!({"label":"Organization SSO","url":format!("https://github.com/orgs/{owner}/sso")}));
    } else if let Ok(repo) = manager
        .backend
        .api("GET", &format!("/repos/{}", target.name), None)
    {
        if repo["owner"]["type"].as_str() == Some("Organization") {
            links.push(json!({"label":"Organization SSO","url":format!("https://github.com/orgs/{owner}/sso")}));
        }
    }
    json!({"runner_status":runners,"jobs":jobs,"manage":{"state":"unknown","message":"Write permission is verified when you perform an operation. Read access does not prove write access."},"local":{"state":"available"},"links":links})
}

fn job_repository(target: &Target, repository: Option<&str>) -> Result<Option<String>> {
    let repository = repository.filter(|s| !s.trim().is_empty());
    if target.kind == "repo" {
        if let Some(repository) = repository {
            let requested = Target::new("repo", repository)?;
            ensure!(
                requested.name.eq_ignore_ascii_case(&target.name),
                "Choose the repository registered to this runner"
            );
        }
        Ok(Some(target.name.clone()))
    } else {
        let Some(repository) = repository else {
            return Ok(None);
        };
        let requested = Target::new("repo", repository)?;
        ensure!(
            requested
                .name
                .split('/')
                .next()
                .is_some_and(|name| name.eq_ignore_ascii_case(&target.name)),
            "Choose a repository belonging to this runner's organization"
        );
        Ok(Some(requested.name))
    }
}

pub fn jobs(manager: &Manager, id: u64, repository: Option<&str>) -> Result<Value> {
    let runner = manager.get(id)?;
    let github_id = runner.github_id.context("Runner is not registered")?;
    let Some(repo) = job_repository(&runner.target, repository)? else {
        return Ok(
            json!({"jobs":[],"needs_repository":true,"message":"Choose a repository in this organization. Only jobs assigned to this runner will appear."}),
        );
    };
    // An explicit, bounded live view; no jobs are written to disk.
    let recent = manager.backend.api(
        "GET",
        &format!("/repos/{repo}/actions/runs?per_page=10"),
        None,
    )?;
    let active = manager.backend.api(
        "GET",
        &format!("/repos/{repo}/actions/runs?per_page=10&status=in_progress"),
        None,
    )?;
    let mut seen = HashSet::new();
    let mut jobs = vec![];
    let mut limited = recent["total_count"].as_u64().unwrap_or(0) > 10
        || active["total_count"].as_u64().unwrap_or(0) > 10;
    for run in active["workflow_runs"]
        .as_array()
        .context("Invalid workflow response")?
        .iter()
        .chain(
            recent["workflow_runs"]
                .as_array()
                .context("Invalid workflow response")?,
        )
    {
        let run_id = run["id"].as_u64().context("Workflow has no ID")?;
        if !seen.insert(run_id) {
            continue;
        }
        let data = manager.backend.api(
            "GET",
            &format!("/repos/{repo}/actions/runs/{run_id}/jobs?per_page=100&filter=latest"),
            None,
        )?;
        limited |= data["total_count"].as_u64().unwrap_or(0) > 100;
        for job in data["jobs"].as_array().context("Invalid jobs response")? {
            if job["runner_id"].as_u64() != Some(github_id) {
                continue;
            }
            jobs.push(json!({
                "id":job["id"], "name":job["name"], "status":job["status"],
                "conclusion":job["conclusion"], "started_at":job["started_at"],
                "completed_at":job["completed_at"], "created_at":job["created_at"],
                "steps":job["steps"], "workflow":run["name"], "branch":run["head_branch"],
                "run_id":run_id, "run_number":run["run_number"], "run_attempt":run["run_attempt"],
                "run_url":format!("https://github.com/{repo}/actions/runs/{run_id}"),
                "event":run["event"], "actor":run["actor"]["login"],
                "triggering_actor":run["triggering_actor"]["login"], "head_sha":run["head_sha"],
                "commit_message":run["head_commit"]["message"], "run_title":run["display_title"],
                "workflow_id":run["workflow_id"], "workflow_path":run["path"],
                "workflow_url":run["workflow_id"].as_u64()
                    .map(|workflow_id| format!("https://github.com/{repo}/actions/workflows/{workflow_id}")),
                "repository":repo, "runner_id":job["runner_id"], "runner_name":job["runner_name"],
                "runner_group_id":job["runner_group_id"], "runner_group_name":job["runner_group_name"],
                "labels":job["labels"],
                "url":format!("https://github.com/{repo}/actions/runs/{run_id}/job/{}",job["id"])
            }));
        }
    }
    Ok(
        json!({"jobs":jobs,"repository":repo,"limited":limited,"message":"Showing assigned jobs from up to 10 active and 10 recent workflow runs (first 100 jobs per run). Unassigned queued jobs cannot be attributed to this Mac."}),
    )
}

pub fn job_logs(
    manager: &Manager,
    id: u64,
    repository: Option<&str>,
    job_id: u64,
    step_number: Option<u64>,
) -> Result<Value> {
    ensure!(job_id > 0, "Choose a valid job");
    let runner = manager.get(id)?;
    ensure!(!runner.deregistered, "Runner is no longer registered");
    let github_id = runner.github_id.context("Runner is not registered")?;
    let repo = job_repository(&runner.target, repository)?
        .context("Choose a repository in this runner's organization")?;
    // Never use caller-supplied job IDs to read another runner's output with host credentials.
    let job = manager
        .backend
        .api("GET", &format!("/repos/{repo}/actions/jobs/{job_id}"), None)?;
    ensure!(
        job["id"].as_u64() == Some(job_id),
        "GitHub returned a different job"
    );
    ensure!(
        job["runner_id"].as_u64() == Some(github_id),
        "This job is not assigned to the selected runner"
    );
    let step = if let Some(number) = step_number {
        let steps = job["steps"].as_array().context("This job has no steps")?;
        let index = steps
            .iter()
            .position(|step| step["number"].as_u64() == Some(number))
            .context("This step does not belong to the selected job")?;
        // The download endpoint takes zero-based position; API numbers may contain gaps.
        Some((index, &steps[index]))
    } else {
        None
    };
    let github_url = format!(
        "https://github.com/{repo}/actions/runs/{}/job/{job_id}",
        job["run_id"]
    );
    let selected = step.map(|(_, value)| value).unwrap_or(&job);
    if selected["status"].as_str() != Some("completed") {
        return Ok(json!({
            "state":"pending", "content":"", "steps":[], "url":github_url,
            "message":"GitHub has not published this log yet. Step status is refreshed while the job runs; open the job on GitHub for live output."
        }));
    }
    let mut download = manager
        .backend
        .job_logs(&repo, job_id, step.map(|(index, _)| index));
    let mut scope = if step.is_some() { "step" } else { "job" };
    if download
        .as_ref()
        .is_err_and(|error| error.to_string().starts_with("GitHub has not published"))
    {
        if let Some((_, selected_step)) = step {
            if job["status"].as_str() == Some("completed") {
                download = match fallback_step_log(manager, &repo, &job, selected_step) {
                    Ok(Some(content)) => Ok(content),
                    Ok(None) => {
                        scope = "job";
                        manager.backend.job_logs(&repo, job_id, None)
                    }
                    Err(error) => Err(error),
                };
            }
        }
    }
    match download {
        Ok(content) => {
            let steps = step
                .filter(|_| scope == "step")
                .map(|(_, value)| {
                    vec![json!({
                        "number":value["number"], "name":value["name"], "content":content
                    })]
                })
                .unwrap_or_default();
            let message = if scope == "job" && step.is_some() {
                "GitHub did not publish a separate log for this step. Showing the complete job log."
            } else {
                "Complete log downloaded from GitHub."
            };
            Ok(json!({
                "state":"available", "scope":scope, "message":message,
                "content":content, "steps":steps, "url":github_url
            }))
        }
        Err(error) => {
            let message = error.to_string();
            let pending = (job["status"].as_str() != Some("completed")
                && message.starts_with("GitHub has not published"))
                || message.contains("workflow is still running");
            Ok(json!({
                "state":if pending { "pending" } else { "unavailable" },
                "message":message, "content":"", "steps":[], "url":github_url
            }))
        }
    }
}

fn fallback_step_log(
    manager: &Manager,
    repo: &str,
    job: &Value,
    step: &Value,
) -> Result<Option<String>> {
    let name = step["name"].as_str().context("The step has no name")?;
    let job_name = job["name"].as_str().context("The job has no name")?;
    if name.chars().any(char::is_control)
        || job_name.chars().any(char::is_control)
        || name == "UNKNOWN STEP"
        || job["steps"]
            .as_array()
            .context("This job has no steps")?
            .iter()
            .filter(|candidate| candidate["name"].as_str() == Some(name))
            .count()
            != 1
    {
        return Ok(None);
    }
    let run_id = job["run_id"]
        .as_u64()
        .context("The job has no workflow run")?;
    let Some(attempt) = job["run_attempt"].as_u64().filter(|value| *value > 0) else {
        return Ok(None);
    };
    let job_id = job["id"].as_u64().context("The job has no ID")?;
    // gh's archive mapping uses sanitized job names. Reject collisions and incomplete lists
    // rather than accidentally returning a different matrix job's output.
    let attempt_jobs = manager.backend.api(
        "GET",
        &format!("/repos/{repo}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100"),
        None,
    )?;
    let rows = attempt_jobs["jobs"]
        .as_array()
        .context("Invalid workflow jobs response")?;
    let key = archive_job_name(job_name);
    if attempt_jobs["total_count"].as_u64() != Some(rows.len() as u64)
        || key.is_empty()
        || rows
            .iter()
            .filter(|candidate| {
                candidate["name"]
                    .as_str()
                    .is_some_and(|name| archive_job_name(name) == key)
            })
            .count()
            != 1
        || !rows.iter().any(|candidate| {
            candidate["id"].as_u64() == Some(job_id) && candidate["name"].as_str() == Some(job_name)
        })
    {
        return Ok(None);
    }
    let output = match manager.backend.step_log_fallback(repo, job_id, attempt) {
        Ok(output) => output,
        Err(error)
            if error.to_string().starts_with("GitHub has not published")
                && !error.to_string().contains("workflow is still running") =>
        {
            return Ok(None);
        }
        Err(error) => return Err(error),
    };
    // Some GitHub archives contain only whole-job files; gh marks all those lines
    // UNKNOWN STEP. Never claim that this output belongs to the selected step.
    Ok(extract_step_log(&output, job_name, name).ok())
}

fn archive_job_name(name: &str) -> String {
    let sanitized = name.replace(['/', ':'], "");
    let units: Vec<u16> = sanitized.encode_utf16().take(90).collect();
    String::from_utf16_lossy(&units).trim().to_string()
}

fn extract_step_log(output: &str, job_name: &str, step_name: &str) -> Result<String> {
    let mut content = String::new();
    let mut found = false;
    for row in output.split_inclusive('\n') {
        let mut parts = row.splitn(3, '\t');
        let job = parts.next().unwrap_or("");
        let step = parts.next();
        let line = parts.next();
        ensure!(
            job == job_name && step.is_some() && line.is_some(),
            "GitHub returned an unrecognized step log format. Open the complete job log instead"
        );
        if step == Some(step_name) {
            content.push_str(line.unwrap());
            found = true;
        }
    }
    ensure!(
        found,
        "GitHub could not identify this step's output. Open the complete job log instead"
    );
    Ok(content)
}

#[derive(Clone)]
struct LoginState {
    generation: u64,
    status: String,
    code: Option<String>,
    pid: Option<i32>,
}
impl Default for LoginState {
    fn default() -> Self {
        Self {
            generation: 0,
            status: "idle".into(),
            code: None,
            pid: None,
        }
    }
}
#[derive(Default)]
pub struct Auth {
    state: Arc<Mutex<LoginState>>,
}
impl Auth {
    pub fn status(&self) -> Value {
        let state = self.state.lock().unwrap();
        json!({"status":state.status,"code":state.code,"url":"https://github.com/login/device"})
    }
    pub fn cancel(&self) -> Value {
        let mut state = self.state.lock().unwrap();
        if let Some(pid) = state.pid.take() {
            unsafe {
                libc::kill(-pid, libc::SIGKILL);
            }
        }
        state.generation += 1;
        state.status = "idle".into();
        state.code = None;
        drop(state);
        self.status()
    }
    pub fn start(&self, manager: &Manager, organization_scope: bool) -> Result<Value> {
        let path = manager
            .backend
            .github_cli()
            .context("GitHub CLI is unavailable. Use the complete release bundle.")?;
        ensure!(!["GH_TOKEN","GITHUB_TOKEN"].iter().any(|key| std::env::var(key).is_ok_and(|v| !v.is_empty())),"GitHub is configured through an environment token. Update that token on the host; browser login would not override it.");
        let mut state = self.state.lock().unwrap();
        if state.status == "pending" {
            drop(state);
            return Ok(self.status());
        }
        let mut command = Command::new(&path);
        command
            .args([
                "auth",
                "login",
                "--hostname",
                "github.com",
                "--web",
                "--git-protocol",
                "https",
            ])
            .env("GH_BROWSER", "/usr/bin/true")
            .env("GH_PROMPT_DISABLED", "1")
            .env("GH_PAGER", "cat")
            .env_remove("GH_DEBUG")
            .env_remove("DEBUG")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .process_group(0);
        if organization_scope {
            command.args(["--scopes", "admin:org"]);
        }
        let mut child = command
            .spawn()
            .with_context(|| format!("Could not start GitHub CLI login ({})", path.display()))?;
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(b"\n");
        }
        state.generation += 1;
        let generation = state.generation;
        state.status = "pending".into();
        state.code = None;
        state.pid = Some(child.id() as i32);
        for pipe in [
            child
                .stdout
                .take()
                .map(|p| Box::new(p) as Box<dyn Read + Send>),
            child
                .stderr
                .take()
                .map(|p| Box::new(p) as Box<dyn Read + Send>),
        ]
        .into_iter()
        .flatten()
        {
            let shared = self.state.clone();
            thread::spawn(move || capture_code(pipe, shared, generation));
        }
        let shared = self.state.clone();
        thread::spawn(move || {
            let started = Instant::now();
            loop {
                let current = shared.lock().unwrap().generation;
                if current != generation || started.elapsed() > Duration::from_secs(15 * 60) {
                    unsafe {
                        libc::kill(-(child.id() as i32), libc::SIGKILL);
                    }
                    let _ = child.wait();
                    let mut state = shared.lock().unwrap();
                    if state.generation == generation {
                        state.pid = None;
                        state.status = "expired".into();
                        state.code = None;
                    }
                    break;
                }
                match child.try_wait() {
                    Ok(Some(exit)) => {
                        let mut state = shared.lock().unwrap();
                        if state.generation == generation {
                            state.pid = None;
                            state.status =
                                if exit.success() { "complete" } else { "failed" }.into();
                            state.code = None;
                        }
                        break;
                    }
                    Err(_) => {
                        let _ = child.kill();
                        let _ = child.wait();
                        let mut state = shared.lock().unwrap();
                        if state.generation == generation {
                            state.pid = None;
                            state.status = "failed".into();
                            state.code = None;
                        }
                        break;
                    }
                    Ok(None) => thread::sleep(Duration::from_millis(200)),
                }
            }
        });
        drop(state);
        Ok(self.status())
    }
}
impl Drop for Auth {
    fn drop(&mut self) {
        self.cancel();
    }
}

fn device_code(text: &str) -> Option<String> {
    let marker = "one-time code:";
    let tail = text.split(marker).nth(1)?;
    tail.split_whitespace()
        .find(|part| {
            part.len() == 9
                && part.as_bytes()[4] == b'-'
                && part
                    .bytes()
                    .enumerate()
                    .all(|(i, b)| i == 4 || b.is_ascii_uppercase() || b.is_ascii_digit())
        })
        .map(str::to_string)
}
fn capture_code(mut pipe: Box<dyn Read + Send>, shared: Arc<Mutex<LoginState>>, generation: u64) {
    let mut retained = String::new();
    let mut buf = [0u8; 1024];
    while let Ok(n) = pipe.read(&mut buf) {
        if n == 0 {
            break;
        }
        retained.push_str(&String::from_utf8_lossy(&buf[..n]));
        if let Some(code) = device_code(&retained) {
            let mut state = shared.lock().unwrap();
            if state.generation == generation && state.status == "pending" {
                state.code = Some(code);
            }
        }
        if retained.len() > 8192 {
            retained = retained
                .chars()
                .rev()
                .take(4096)
                .collect::<String>()
                .chars()
                .rev()
                .collect();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct ConnectionFixture(std::result::Result<Value, String>);

    impl crate::core::Backend for ConnectionFixture {
        fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
            assert_eq!(method, "GET");
            assert_eq!(endpoint, "/user");
            assert!(body.is_none());
            self.0.clone().map_err(anyhow::Error::msg)
        }
        fn prepare(&self, _: &crate::core::Runner) -> Result<String> {
            unreachable!()
        }
        fn configure(&self, _: &crate::core::Runner) -> Result<u64> {
            unreachable!()
        }
        fn recover_registration(&self, _: &crate::core::Runner) -> Result<Option<u64>> {
            unreachable!()
        }
        fn install_service(&self, _: &crate::core::Runner) -> Result<()> {
            unreachable!()
        }
        fn start(&self, _: &crate::core::Runner) -> Result<()> {
            unreachable!()
        }
        fn stop(&self, _: &crate::core::Runner) -> Result<()> {
            unreachable!()
        }
        fn remove_service(&self, _: &crate::core::Runner) -> Result<()> {
            unreachable!()
        }
        fn local_status(&self, _: &crate::core::Runner) -> Result<String> {
            unreachable!()
        }
    }

    #[test]
    fn connection_distinguishes_authentication_from_unavailable_account_checks() {
        let cases = [
            (Ok(json!({"login":"octocat"})), "connected"),
            (
                Err("GitHub authentication is missing or expired. Run `mactions auth login` on this Mac".into()),
                "disconnected",
            ),
            (Err("Could not connect to api.github.com".into()), "unavailable"),
            (Ok(json!({"message":"Service unavailable"})), "unavailable"),
            (Ok(json!({"login":""})), "unavailable"),
        ];
        for (response, expected_state) in cases {
            let dir = tempfile::tempdir().unwrap();
            let manager = Manager::new(
                dir.path().join("data"),
                Arc::new(ConnectionFixture(response.clone())),
            )
            .unwrap();
            let result = connection(&manager);
            assert_eq!(result["state"], expected_state);
            assert_eq!(result["connected"], expected_state == "connected");
            if expected_state == "connected" {
                assert_eq!(result["login"], "octocat");
            } else {
                assert!(result["login"].is_null());
            }
            if let Err(message) = response {
                assert_eq!(result["message"], message);
            } else {
                assert!(result["message"].is_string());
            }
        }
    }

    fn log_fixture() -> (tempfile::TempDir, Manager, Value) {
        use crate::{core::Runner, native::Native};
        use std::{fs, os::unix::fs::PermissionsExt};
        let dir = tempfile::tempdir().unwrap();
        let executable = dir.path().join("gh");
        fs::write(
            &executable,
            format!(
                r#"#!/bin/bash
set -eu
cd '{}'
printf '%s\n' "$*" >> requests
if [ "$1" = run ]; then cat fallback.log; exit; fi
case "${{!#}}" in
  */steps/*/logs) if [ -f step.log ]; then cat step.log; else echo 'HTTP 404' >&2; exit 1; fi;;
  */jobs/70/logs) cat job.log;;
  */jobs/70) cat job.json;;
  */attempts/2/jobs*) cat attempt.json;;
  *) exit 1;;
esac
"#,
                dir.path().display()
            ),
        )
        .unwrap();
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o755)).unwrap();
        let manager = Manager::new(
            dir.path().join("data"),
            Arc::new(Native {
                root: dir.path().into(),
                gh: executable,
            }),
        )
        .unwrap();
        manager
            .save(&Runner {
                id: 1,
                name: "mac-1".into(),
                target: Target::new("repo", "example/build").unwrap(),
                labels: vec![],
                path: manager.root.join("actions-runner-1"),
                version: None,
                github_id: Some(42),
                enabled: true,
                phase: "running".into(),
                error: None,
                deregistered: false,
                registration_attempted: true,
            })
            .unwrap();
        let job = json!({"id":70,"runner_id":42,"run_id":8,"run_attempt":2,
        "name":"Build", "status":"completed", "steps":[
            {"number":1,"name":"Checkout","status":"completed"},
            {"number":5,"name":"Tests","status":"completed"}
        ]});
        fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
        fs::write(
            dir.path().join("attempt.json"),
            json!({"total_count":1,"jobs":[job.clone()]}).to_string(),
        )
        .unwrap();
        fs::write(dir.path().join("job.log"), "complete job output\n").unwrap();
        fs::write(
            dir.path().join("fallback.log"),
            "Build\tCheckout\tcheckout\nBuild\tTests\ttests\n",
        )
        .unwrap();
        (dir, manager, job)
    }

    #[test]
    fn job_logs_validate_repository_and_runner_before_download() {
        let (dir, manager, mut job) = log_fixture();
        assert!(job_logs(&manager, 1, Some("other/repo"), 70, None).is_err());
        assert!(!dir.path().join("requests").exists());
        job["runner_id"] = json!(99);
        std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
        assert!(job_logs(&manager, 1, None, 70, None)
            .unwrap_err()
            .to_string()
            .contains("selected runner"));
        let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
        assert!(!requests.contains("/logs"));
        let mut runner = manager.get(1).unwrap();
        runner.target = Target::new("org", "example").unwrap();
        manager.save(&runner).unwrap();
        assert!(job_logs(&manager, 1, Some("unrelated/repo"), 70, None).is_err());
        assert!(job_logs(&manager, 1, None, 70, None).is_err());
    }

    #[test]
    fn step_logs_use_zero_based_position_even_with_duplicate_names_and_number_gaps() {
        let (dir, manager, mut job) = log_fixture();
        job["steps"][0]["name"] = json!("Tests");
        std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
        std::fs::write(dir.path().join("step.log"), "second Tests output\n").unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "available");
        assert_eq!(result["scope"], "step");
        assert_eq!(result["content"], "second Tests output\n");
        assert_eq!(result["steps"][0]["number"], 5);
        assert!(std::fs::read_to_string(dir.path().join("requests"))
            .unwrap()
            .contains("/steps/1/logs"));
        assert!(job_logs(&manager, 1, None, 70, Some(2)).is_err());
    }

    #[test]
    fn unavailable_step_endpoint_falls_back_to_verified_attempt_and_exact_name() {
        let (dir, manager, _) = log_fixture();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "available");
        assert_eq!(result["scope"], "step");
        assert_eq!(result["content"], "tests\n");
        let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
        assert!(requests.contains("/attempts/2/jobs"));
        assert!(requests.contains("--job 70 --attempt 2 --log"));
        let full = job_logs(&manager, 1, None, 70, None).unwrap();
        assert_eq!(full["content"], "complete job output\n");
    }

    #[test]
    fn unknown_step_mapping_returns_complete_job_without_associating_it_to_a_step() {
        let (dir, manager, _) = log_fixture();
        std::fs::write(
            dir.path().join("fallback.log"),
            "Build\tUNKNOWN STEP\tcheckout\nBuild\tUNKNOWN STEP\ttests\n",
        )
        .unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "available");
        assert_eq!(result["scope"], "job");
        assert_eq!(result["content"], "complete job output\n");
        assert_eq!(result["steps"], json!([]));
        assert_eq!(
            result["message"],
            "GitHub did not publish a separate log for this step. Showing the complete job log."
        );
        let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
        assert!(requests.contains("/steps/1/logs"));
        assert!(requests.contains("/attempts/2/jobs"));
        assert!(requests.contains("/jobs/70/logs"));
    }

    #[test]
    fn ambiguous_step_names_and_job_archives_use_complete_job_scope() {
        let (dir, manager, mut job) = log_fixture();
        job["steps"][0]["name"] = json!("Tests");
        std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "available");
        assert_eq!(result["scope"], "job");
        assert_eq!(result["content"], "complete job output\n");
        assert_eq!(result["steps"], json!([]));
        job["steps"][0]["name"] = json!("Checkout");
        std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
        std::fs::write(
            dir.path().join("attempt.json"),
            json!({"total_count":2,
            "jobs":[job,{"id":71,"name":"Bui/ld:"}]})
            .to_string(),
        )
        .unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "available");
        assert_eq!(result["scope"], "job");
        assert_eq!(result["steps"], json!([]));
        assert!(!std::fs::read_to_string(dir.path().join("requests"))
            .unwrap()
            .contains("run view"));
    }

    #[test]
    fn unverified_attempt_archive_cannot_supply_selected_step_output() {
        let (dir, manager, mut job) = log_fixture();
        job["id"] = json!(71);
        std::fs::write(
            dir.path().join("attempt.json"),
            json!({"total_count":1,"jobs":[job]}).to_string(),
        )
        .unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "available");
        assert_eq!(result["scope"], "job");
        assert_eq!(result["content"], "complete job output\n");
        let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
        assert!(requests.contains("/attempts/2/jobs"));
        assert!(!requests.contains("run view"));
        assert!(requests.contains("/jobs/70/logs"));
    }

    #[test]
    fn step_authentication_and_access_errors_are_not_replaced_with_complete_job_output() {
        for (status, expected_message) in [("401", "authentication"), ("403", "denied log access")]
        {
            let (dir, manager, _) = log_fixture();
            let executable = dir.path().join("gh");
            let script = std::fs::read_to_string(&executable)
                .unwrap()
                .replace("HTTP 404", &format!("HTTP {status}"));
            std::fs::write(executable, script).unwrap();
            let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
            assert_eq!(result["state"], "unavailable");
            assert!(result["message"]
                .as_str()
                .unwrap()
                .contains(expected_message));
            let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
            assert!(!requests.contains("run view"));
            assert!(!requests.contains("/jobs/70/logs"));
        }
    }

    #[test]
    fn unfinished_logs_are_pending_without_claiming_a_complete_download() {
        let (dir, manager, mut job) = log_fixture();
        job["status"] = json!("in_progress");
        job["steps"][1]["status"] = json!("in_progress");
        std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
        assert_eq!(
            job_logs(&manager, 1, None, 70, Some(5)).unwrap()["state"],
            "pending"
        );
        assert_eq!(
            job_logs(&manager, 1, None, 70, None).unwrap()["state"],
            "pending"
        );
        assert!(!std::fs::read_to_string(dir.path().join("requests"))
            .unwrap()
            .contains("/logs"));
        // Completed steps may be available before the rest of a workflow finishes.
        std::fs::write(dir.path().join("step.log"), "checkout done\n").unwrap();
        assert_eq!(
            job_logs(&manager, 1, None, 70, Some(1)).unwrap()["state"],
            "available"
        );
    }

    #[test]
    fn completed_job_waits_for_step_archive_while_other_workflow_jobs_are_running() {
        let (dir, manager, _) = log_fixture();
        let executable = dir.path().join("gh");
        let script = std::fs::read_to_string(&executable).unwrap().replace(
            "if [ \"$1\" = run ]; then cat fallback.log; exit; fi",
            "if [ \"$1\" = run ]; then echo 'run 8 is still in progress' >&2; exit 1; fi",
        );
        std::fs::write(executable, script).unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "pending");
        assert!(result["message"]
            .as_str()
            .unwrap()
            .contains("workflow is still running"));
        assert_eq!(
            job_logs(&manager, 1, None, 70, None).unwrap()["state"],
            "available"
        );
    }

    #[test]
    fn step_fallback_keeps_tabs_and_newlines_but_rejects_unknown_or_malformed_rows() {
        assert_eq!(
            extract_step_log(
                "Build\tTests\tfirst\tvalue\nBuild\tCheckout\tskip\nBuild\tTests\tlast",
                "Build",
                "Tests"
            )
            .unwrap(),
            "first\tvalue\nlast"
        );
        assert!(extract_step_log("Build\tUNKNOWN STEP\tvalue\n", "Build", "Tests").is_err());
        assert!(extract_step_log("Other\tTests\tvalue\n", "Build", "Tests").is_err());
        assert!(extract_step_log("missing separators\n", "Build", "Tests").is_err());
    }

    #[test]
    fn device_login_is_pollable_and_raw_cli_output_is_not_exposed() {
        use crate::native::Native;
        use std::{fs, os::unix::fs::PermissionsExt};
        let dir = tempfile::tempdir().unwrap();
        let executable = dir.path().join("gh-fixture");
        fs::write(&executable,"#!/bin/sh\nprintf '! First copy your one-time code: ABCD-1234\\nprivate-output-never-returned\\n' >&2\nsleep 1\n").unwrap();
        fs::set_permissions(&executable, fs::Permissions::from_mode(0o755)).unwrap();
        let manager = Manager::new(
            dir.path().join("data"),
            Arc::new(Native {
                root: dir.path().into(),
                gh: executable,
            }),
        )
        .unwrap();
        let auth = Auth::default();
        assert_eq!(auth.start(&manager, false).unwrap()["status"], "pending");
        let start = Instant::now();
        while auth.status()["code"].is_null() && start.elapsed() < Duration::from_secs(3) {
            thread::sleep(Duration::from_millis(20));
        }
        assert_eq!(auth.status()["code"], "ABCD-1234");
        assert!(!auth.status().to_string().contains("private-output"));
        assert_eq!(auth.start(&manager, false).unwrap()["code"], "ABCD-1234");
        while auth.status()["status"] == "pending" && start.elapsed() < Duration::from_secs(4) {
            thread::sleep(Duration::from_millis(20));
        }
        assert_eq!(auth.status()["status"], "complete");
        assert!(auth.status()["code"].is_null());
        assert!(auth.state.lock().unwrap().pid.is_none());
        auth.start(&manager, false).unwrap();
        assert_eq!(auth.cancel()["status"], "idle");
        thread::sleep(Duration::from_millis(300));
        assert_eq!(auth.status()["status"], "idle");
    }
    #[test]
    fn exposes_only_device_code_not_cli_output() {
        assert_eq!(
            device_code("! First copy your one-time code: ABCD-1234\nsecret"),
            Some("ABCD-1234".into())
        );
        assert_eq!(device_code("ghp_secret ABCD-1234"), None);
    }
}
