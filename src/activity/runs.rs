//! Workflow run searches, attempt attribution, and run details.
use super::{
    jobs::{run_jobs, run_jobs_counted},
    normalize::{normalize_job, normalize_run},
    read::{
        has_next, page_number, parallel_reads, reached_run_limit, refresh_notice, refresh_seconds,
        ACTIVE_STATUSES, FILTERED_MAX_PAGES, MAX_PAGES, PAGE_SIZE,
    },
    scope::{resolve, Scope},
};
use crate::core::{Manager, Runner, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashSet};

pub fn runs(manager: &Manager, scope: &Scope, page: u64, runner_id: Option<u64>) -> Result<Value> {
    runs_filtered(manager, scope, page, runner_id, None)
}

fn search_statuses(status: &str, runner_filter: bool) -> Result<Vec<&str>> {
    match status {
        "" | "all" => Ok(vec![""]),
        "active" => Ok(ACTIVE_STATUSES.to_vec()),
        "success" | "failure" | "cancelled" | "skipped" => {
            // GitHub filters by the latest attempt; earlier owned attempts can have another result.
            Ok(vec![if runner_filter { "" } else { status }])
        }
        _ => anyhow::bail!("Choose a supported run status"),
    }
}

fn matches_status(run: &Value, status: &str) -> bool {
    match status {
        "" | "all" => true,
        "active" => run["status"]
            .as_str()
            .is_some_and(|value| ACTIVE_STATUSES.contains(&value)),
        _ => run["conclusion"].as_str() == Some(status),
    }
}

type AttemptRows = (Vec<Value>, Vec<String>);

fn runner_attempts(
    manager: &Manager,
    repo: &str,
    raw: &Value,
    runner: u64,
    records: &[Runner],
) -> (Result<AttemptRows>, usize) {
    let Some(id) = raw["id"].as_u64() else {
        return (Err(anyhow::anyhow!("Run has no ID")), 0);
    };
    let (jobs, mut reads) = run_jobs_counted(manager, repo, id, None, true);
    let result = (|| {
        let jobs = jobs?;
        let mut attempts = BTreeMap::<u64, Vec<Value>>::new();
        for job in jobs
            .into_iter()
            .filter(|job| job["runner_id"].as_u64() == Some(runner))
        {
            let attempt = job["run_attempt"]
                .as_u64()
                .filter(|a| *a > 0)
                .unwrap_or_else(|| raw["run_attempt"].as_u64().unwrap_or(1));
            attempts.entry(attempt).or_default().push(job);
        }
        let mut runs = vec![];
        let mut warnings = vec![];
        // Preserve work on previous runners when a workflow is rerun on another device.
        for (attempt, assigned) in attempts.into_iter().rev() {
            let metadata = if raw["run_attempt"].as_u64() == Some(attempt) {
                raw.clone()
            } else {
                reads += 1;
                let response = match manager.backend.api(
                    "GET",
                    &format!("/repos/{repo}/actions/runs/{id}/attempts/{attempt}"),
                    None,
                ) {
                    Ok(data) => data,
                    Err(error) => {
                        warnings.push(format!(
                            "Attempt {attempt} of {repo} run {id} is unavailable: {error}"
                        ));
                        continue;
                    }
                };
                ensure!(
                    response["id"].as_u64() == Some(id),
                    "GitHub returned a different run"
                );
                response
            };
            let mut run = normalize_run(&metadata, repo);
            run["attempt"] = json!(attempt);
            run["jobs"] = json!(assigned
                .iter()
                .map(|job| normalize_job(job, &metadata, repo, records, false))
                .collect::<Vec<_>>());
            runs.push(run);
        }
        Ok((runs, warnings))
    })();
    (result, reads)
}

pub fn runs_filtered(
    manager: &Manager,
    scope: &Scope,
    page: u64,
    runner_id: Option<u64>,
    status: Option<&str>,
) -> Result<Value> {
    page_number(page)?;
    ensure!(runner_id.is_none_or(|id| id > 0), "Choose a valid runner");
    let status = status.unwrap_or("all");
    let statuses = search_statuses(status, runner_id.is_some())?;
    let search_pages = if statuses.iter().all(|value| value.is_empty()) {
        MAX_PAGES
    } else {
        FILTERED_MAX_PAGES
    };
    ensure!(page <= search_pages, "GitHub status-filtered searches support at most 50 pages; choose All statuses to browse older runs");
    let mut resolved = resolve(manager, scope)?;
    let records = manager.records()?;
    let mut runs = vec![];
    let mut next = false;
    let requests: Vec<_> = resolved
        .repositories
        .iter()
        .flat_map(|repo| {
            statuses
                .iter()
                .map(move |status| (repo.clone(), status.to_string()))
        })
        .collect();
    let responses = parallel_reads(&requests, |(repo, status)| {
        manager.backend.api(
            "GET",
            &format!(
                "/repos/{repo}/actions/runs?per_page={PAGE_SIZE}&page={page}{}",
                if status.is_empty() {
                    String::new()
                } else {
                    format!("&status={status}")
                }
            ),
            None,
        )
    });
    let mut reads = resolved.discovery_reads + requests.len();
    let mut candidates = vec![];
    let mut seen = HashSet::new();
    for ((repo, search_status), response) in requests.iter().zip(responses) {
        let response = match response {
            Ok(data) => data,
            Err(error) => {
                resolved.messages.push(format!(
                    "{} runs for {repo} are unavailable: {error}",
                    if search_status.is_empty() {
                        "All"
                    } else {
                        search_status.as_str()
                    }
                ));
                continue;
            }
        };
        let rows = response["workflow_runs"]
            .as_array()
            .context("Invalid workflow response")?;
        next |= has_next(&response, rows.len(), page) && page < search_pages;
        if search_pages == FILTERED_MAX_PAGES
            && page == search_pages
            && (rows.len() == PAGE_SIZE
                || response["total_count"]
                    .as_u64()
                    .is_some_and(|total| total > 1000))
        {
            resolved.messages.push(format!("Status-filtered runs for {repo} reached GitHub's 1,000-run search limit. Choose All statuses or open GitHub to browse older runs."));
        }
        if reached_run_limit(&response, rows.len(), page) {
            resolved.messages.push(format!("Runs for {repo} reached the 2,000-run history limit. Open GitHub to browse older runs."));
        }
        for raw in rows {
            let id = raw["id"].as_u64().context("Run has no ID")?;
            if seen.insert((repo.to_ascii_lowercase(), id)) {
                candidates.push((repo.clone(), raw.clone()));
            }
        }
    }
    if let Some(runner) = runner_id {
        let results = parallel_reads(&candidates, |(repo, raw)| {
            runner_attempts(manager, repo, raw, runner, &records)
        });
        for ((repo, raw), (result, job_reads)) in candidates.iter().zip(results) {
            reads += job_reads;
            match result {
                Ok((attempts, warnings)) => {
                    runs.extend(
                        attempts
                            .into_iter()
                            .filter(|run| matches_status(run, status)),
                    );
                    resolved.messages.extend(warnings);
                }
                Err(error) => resolved.messages.push(format!(
                    "Jobs for {repo} run {} are unavailable: {error}",
                    raw["id"]
                )),
            }
        }
    } else {
        runs.extend(
            candidates
                .iter()
                .map(|(repo, raw)| normalize_run(raw, repo))
                .filter(|run| matches_status(run, status)),
        );
    }
    if status == "active" {
        resolved.messages.push("Active results include up to 20 running, queued, waiting, pending, and requested workflow runs per status per repository on each page.".into());
    } else if resolved.repositories.len() > 1 {
        resolved.messages.push("Each page searches up to 20 workflow runs per repository, merged by recency. Runner filtering includes every matching attempt; later pages may contain more matching runs.".into());
    }
    if runner_id.is_some() {
        resolved.messages.push("Runner filtering searches every attempt of the workflow runs on this page. Each matching attempt has its own row. Result filters apply to each attempt; load later pages to search more runs.".into());
    }
    sort_runs(&mut runs);
    let refresh = refresh_seconds(reads);
    refresh_notice(&mut resolved.messages, refresh);
    Ok(
        json!({"runs":runs,"next_page":if next {Some(page + 1)} else {None},"message":resolved.messages.join(" "),"refresh_after_seconds":refresh}),
    )
}

pub(super) fn sort_runs(runs: &mut [Value]) {
    runs.sort_by(|a, b| {
        b["created_at"]
            .as_str()
            .unwrap_or("")
            .cmp(a["created_at"].as_str().unwrap_or(""))
    });
}

pub fn run(
    manager: &Manager,
    repository: &str,
    run_id: u64,
    attempt: Option<u64>,
) -> Result<Value> {
    let repo = Target::new("repo", repository)?.name;
    ensure!(
        run_id > 0 && attempt.is_none_or(|a| a > 0),
        "Choose a valid run and attempt"
    );
    let path = if let Some(attempt) = attempt {
        format!("/repos/{repo}/actions/runs/{run_id}/attempts/{attempt}")
    } else {
        format!("/repos/{repo}/actions/runs/{run_id}")
    };
    let raw = manager.backend.api("GET", &path, None)?;
    ensure!(
        raw["id"].as_u64() == Some(run_id),
        "GitHub returned a different run"
    );
    let records = manager.records()?;
    let jobs = run_jobs(manager, &repo, run_id, attempt, false)?;
    let jobs: Vec<Value> = jobs
        .iter()
        .map(|job| normalize_job(job, &raw, &repo, &records, false))
        .collect();
    Ok(json!({"run":normalize_run(&raw,&repo),"jobs":jobs}))
}
