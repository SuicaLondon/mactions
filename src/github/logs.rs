//! Published job and step logs, with verified archive fallback.
use super::jobs::job_repository;
use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};

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
    read_job_logs(manager, &repo, job_id, step_number, &job)
}

/// Read published logs for an explicitly selected repository job, including remote runners.
pub fn repository_job_logs(
    manager: &Manager,
    repository: &str,
    job_id: u64,
    step_number: Option<u64>,
) -> Result<Value> {
    let repo = Target::new("repo", repository)?.name;
    ensure!(job_id > 0, "Choose a valid job");
    let job = manager
        .backend
        .api("GET", &format!("/repos/{repo}/actions/jobs/{job_id}"), None)?;
    ensure!(
        job["id"].as_u64() == Some(job_id),
        "GitHub returned a different job"
    );
    read_job_logs(manager, &repo, job_id, step_number, &job)
}

fn read_job_logs(
    manager: &Manager,
    repo: &str,
    job_id: u64,
    step_number: Option<u64>,
    job: &Value,
) -> Result<Value> {
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
    let selected = step.map(|(_, value)| value).unwrap_or(job);
    if selected["status"].as_str() != Some("completed") {
        return Ok(json!({
            "state":"pending", "content":"", "steps":[], "url":github_url,
            "message":"GitHub has not published this log yet. Step status is refreshed while the job runs; open the job on GitHub for live output."
        }));
    }
    let mut download = manager
        .backend
        .job_logs(repo, job_id, step.map(|(index, _)| index));
    let mut scope = if step.is_some() { "step" } else { "job" };
    if download
        .as_ref()
        .is_err_and(|error| error.to_string().starts_with("GitHub has not published"))
    {
        if let Some((_, selected_step)) = step {
            if job["status"].as_str() == Some("completed") {
                download = match fallback_step_log(manager, repo, job, selected_step) {
                    Ok(Some(content)) => Ok(content),
                    Ok(None) => {
                        scope = "job";
                        manager.backend.job_logs(repo, job_id, None)
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

#[cfg(test)]
#[path = "tests/logs.rs"]
mod tests;
