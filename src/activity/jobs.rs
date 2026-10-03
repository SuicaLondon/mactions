//! Job pagination, selected job details, and exact-name history.
use super::{
    normalize::normalize_job,
    read::{
        has_next, page_number, parallel_reads, reached_run_limit, refresh_seconds, MAX_PAGES,
        PAGE_SIZE,
    },
};
use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};

pub(super) fn run_jobs(
    manager: &Manager,
    repo: &str,
    run_id: u64,
    attempt: Option<u64>,
    all_attempts: bool,
) -> Result<Vec<Value>> {
    run_jobs_counted(manager, repo, run_id, attempt, all_attempts).0
}

pub(super) fn run_jobs_counted(
    manager: &Manager,
    repo: &str,
    run_id: u64,
    attempt: Option<u64>,
    all_attempts: bool,
) -> (Result<Vec<Value>>, usize) {
    let path = if let Some(attempt) = attempt {
        format!("/repos/{repo}/actions/runs/{run_id}/attempts/{attempt}/jobs")
    } else {
        format!("/repos/{repo}/actions/runs/{run_id}/jobs")
    };
    let filter = if attempt.is_none() {
        if all_attempts {
            "&filter=all"
        } else {
            "&filter=latest"
        }
    } else {
        ""
    };
    let mut jobs = vec![];
    let mut reads = 0;
    let result = (|| {
        for page in 1..=MAX_PAGES {
            reads += 1;
            let response = manager.backend.api(
                "GET",
                &format!("{path}?per_page=100&page={page}{filter}"),
                None,
            )?;
            let rows = response["jobs"]
                .as_array()
                .context("Invalid workflow jobs response")?;
            jobs.extend(rows.iter().cloned());
            let more = response["total_count"]
                .as_u64()
                .map(|total| total > jobs.len() as u64)
                .unwrap_or(rows.len() == 100);
            if !more {
                return Ok(jobs);
            }
            ensure!(
            rows.len() == 100,
            "GitHub returned an incomplete jobs page; open the run on GitHub for the complete list"
        );
        }
        anyhow::bail!("This workflow exceeds the 10,000-job detail limit; open it on GitHub for the complete list")
    })();
    (result, reads)
}

pub fn job(manager: &Manager, repository: &str, job_id: u64) -> Result<Value> {
    let repo = Target::new("repo", repository)?.name;
    ensure!(job_id > 0, "Choose a valid job");
    let raw = manager
        .backend
        .api("GET", &format!("/repos/{repo}/actions/jobs/{job_id}"), None)?;
    ensure!(
        raw["id"].as_u64() == Some(job_id),
        "GitHub returned a different job"
    );
    let run_id = raw["run_id"].as_u64().context("Job has no run ID")?;
    let attempt = raw["run_attempt"].as_u64().filter(|a| *a > 0);
    let path = attempt
        .map(|a| format!("/repos/{repo}/actions/runs/{run_id}/attempts/{a}"))
        .unwrap_or_else(|| format!("/repos/{repo}/actions/runs/{run_id}"));
    let run = manager.backend.api("GET", &path, None)?;
    ensure!(
        run["id"].as_u64() == Some(run_id),
        "GitHub returned a different run"
    );
    Ok(normalize_job(&raw, &run, &repo, &manager.records()?, true))
}

pub fn job_history(
    manager: &Manager,
    repository: &str,
    workflow_id: u64,
    job_name: &str,
    page: u64,
) -> Result<Value> {
    let repo = Target::new("repo", repository)?.name;
    page_number(page)?;
    ensure!(workflow_id > 0, "Choose a valid workflow");
    ensure!(
        !job_name.trim().is_empty()
            && job_name.len() <= 1024
            && !job_name.chars().any(char::is_control),
        "Choose a valid job name"
    );
    let response = manager.backend.api(
        "GET",
        &format!(
            "/repos/{repo}/actions/workflows/{workflow_id}/runs?per_page={PAGE_SIZE}&page={page}"
        ),
        None,
    )?;
    let rows = response["workflow_runs"]
        .as_array()
        .context("Invalid workflow history response")?;
    let records = manager.records()?;
    let mut jobs = vec![];
    let mut warnings = vec![];
    for raw in rows {
        ensure!(
            raw["workflow_id"].as_u64() == Some(workflow_id),
            "GitHub returned a different workflow"
        );
    }
    let histories = parallel_reads(rows, |raw| {
        let Some(id) = raw["id"].as_u64() else {
            return (Err(anyhow::anyhow!("Run has no ID")), 0);
        };
        run_jobs_counted(manager, &repo, id, None, true)
    });
    let mut reads = 1; // The workflow's paginated run list.
    for (raw, (items, job_reads)) in rows.iter().zip(histories) {
        reads += job_reads;
        let id = raw["id"].as_u64().context("Run has no ID")?;
        let items = match items {
            Ok(items) => items,
            Err(error) => {
                warnings.push(format!("Jobs for run {id} are unavailable: {error}"));
                continue;
            }
        };
        for item in items {
            if item["name"].as_str() == Some(job_name) {
                jobs.push(normalize_job(&item, raw, &repo, &records, false));
            }
        }
    }
    let mut message = "Matching the exact job name within this repository and workflow, including all run attempts. Each page searches 20 workflow runs; renamed jobs and different matrix names have separate histories.".to_string();
    if reached_run_limit(&response, rows.len(), page) {
        message.push_str(
            " This history reached the 2,000-run limit. Open GitHub to browse older runs.",
        );
    }
    if !warnings.is_empty() {
        message.push(' ');
        message.push_str(&warnings.join(" "));
    }
    let refresh = refresh_seconds(reads);
    if refresh > 30 {
        message.push_str(
            " Automatic refresh slows for this scope. You can refresh manually at any time.",
        );
    }
    Ok(
        json!({"jobs":jobs,"next_page":if has_next(&response, rows.len(), page) {Some(page + 1)} else {None},
        "message":message,"refresh_after_seconds":refresh}),
    )
}
