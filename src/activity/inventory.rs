//! Runner inventory and the work currently assigned to those runners.
use super::{
    jobs::run_jobs_counted,
    normalize::{label_names, normalize_job, normalize_run},
    read::{page_number, parallel_reads, refresh_notice, refresh_seconds, MAX_PAGES, PAGE_SIZE},
    runs::sort_runs,
    scope::{belongs_to_repository, matches_scope, repository_owner, resolve, Scope},
};
use crate::core::Manager;
use anyhow::{Context, Result};
use serde_json::{json, Value};
use std::collections::HashSet;

pub fn runners(manager: &Manager, scope: &Scope, page: u64) -> Result<Value> {
    page_number(page)?;
    let records = manager.records()?;
    let mut resolved = resolve(manager, scope)?;
    let mut rows = vec![];
    let mut seen = HashSet::new();
    let mut next = false;
    let responses = parallel_reads(&resolved.targets, |target| {
        manager.backend.api(
            "GET",
            &format!("{}?per_page=100&page={page}", target.api()),
            None,
        )
    });
    for (target, response) in resolved.targets.iter().zip(responses) {
        let response = match response {
            Ok(data) => data,
            Err(error) => {
                resolved.messages.push(format!(
                    "Runner inventory for {} is unavailable: {error}",
                    target.name
                ));
                continue;
            }
        };
        let remote = response["runners"]
            .as_array()
            .context("Invalid GitHub runner list")?;
        next |= remote.len() == 100 && page < MAX_PAGES;
        if page == MAX_PAGES && remote.len() == 100 {
            resolved.messages.push(format!("Runner inventory for {} reached the 10,000-runner limit. Open GitHub to browse further.", target.name));
        }
        for row in remote {
            let id = row["id"].as_u64().context("Runner has no GitHub ID")?;
            let owner = repository_owner(&target.name).to_ascii_lowercase();
            if !seen.insert((owner, id)) {
                continue;
            }
            let local = records.iter().find(|r| {
                !r.deregistered
                    && r.github_id == Some(id)
                    && if target.kind == "repo" {
                        belongs_to_repository(r, &target.name)
                    } else {
                        r.target.kind == target.kind
                            && r.target.name.eq_ignore_ascii_case(&target.name)
                    }
            });
            let mut item = local
                .map(serde_json::to_value)
                .transpose()?
                .unwrap_or_else(|| json!({}));
            item["github_id"] = json!(id);
            item["local_id"] = json!(local.map(|r| r.id));
            item["name"] = row["name"].clone();
            item["status"] = row["status"].clone();
            item["github_status"] = row["status"].clone();
            item["busy"] = row["busy"].clone();
            item["labels"] = json!(label_names(row));
            item["github_labels"] = row["labels"].clone();
            item["host_type"] = json!("self-hosted"); // This API lists self-hosted runners only.
            item["device"] = json!(if local.is_some() {
                "this_device"
            } else {
                "other_device"
            });
            item["target"] = serde_json::to_value(local.map(|r| &r.target).unwrap_or(target))?;
            if let Some(runner) = local {
                match manager.backend.local_status(runner) {
                    Ok(status) => item["local_status"] = json!(status),
                    Err(error) => {
                        item["local_status"] = json!("unknown");
                        item["local_error"] = json!(error.to_string());
                    }
                }
            }
            rows.push(item);
        }
    }
    // Failed, new, stopped, or missing registrations remain manageable on this device.
    if page == 1 {
        for runner in records.iter().filter(|r| matches_scope(r, scope)) {
            if rows
                .iter()
                .any(|row| row["local_id"].as_u64() == Some(runner.id))
            {
                continue;
            }
            if scope.repository.is_some() && runner.target.kind == "org" {
                // The repository API is the authority on which shared runners it can use.
                continue;
            }
            let mut item = serde_json::to_value(runner)?;
            item["local_id"] = json!(runner.id);
            item["status"] = json!(if runner.deregistered {
                "not_registered"
            } else {
                "unknown"
            });
            item["github_status"] = item["status"].clone();
            item["host_type"] = json!("self-hosted");
            item["device"] = json!("this_device");
            item["busy"] = Value::Null;
            item["local_status"] = json!(manager
                .backend
                .local_status(runner)
                .unwrap_or_else(|_| "unknown".into()));
            rows.push(item);
        }
    }
    rows.sort_by_key(|row| {
        (
            row["local_id"].is_null(),
            row["name"].as_str().unwrap_or("").to_ascii_lowercase(),
        )
    });
    let refresh = refresh_seconds(resolved.discovery_reads + resolved.targets.len());
    refresh_notice(&mut resolved.messages, refresh);
    Ok(
        json!({"runners":rows,"next_page":if next {Some(page + 1)} else {None},"message":resolved.messages.join(" "),"refresh_after_seconds":refresh}),
    )
}

pub fn work(manager: &Manager, scope: &Scope) -> Result<Value> {
    let mut resolved = resolve(manager, scope)?;
    let records = manager.records()?;
    let mut runs = vec![];
    let mut seen = HashSet::new();
    let requests: Vec<_> = resolved
        .repositories
        .iter()
        .flat_map(|repo| ["in_progress", "queued"].map(|status| (repo.clone(), status)))
        .collect();
    let responses = parallel_reads(&requests, |(repo, status)| {
        manager.backend.api(
            "GET",
            &format!("/repos/{repo}/actions/runs?per_page={PAGE_SIZE}&status={status}&page=1"),
            None,
        )
    });
    let mut candidates = vec![];
    for ((repo, status), response) in requests.iter().zip(responses) {
        let response = match response {
            Ok(data) => data,
            Err(error) => {
                resolved
                    .messages
                    .push(format!("{status} runs for {repo} are unavailable: {error}"));
                continue;
            }
        };
        for raw in response["workflow_runs"]
            .as_array()
            .context("Invalid workflow response")?
        {
            let id = raw["id"].as_u64().context("Run has no ID")?;
            if !seen.insert((repo.to_ascii_lowercase(), id)) {
                continue;
            }
            candidates.push((repo.clone(), raw.clone()));
        }
    }
    let jobs = parallel_reads(&candidates, |(repo, raw)| {
        let Some(id) = raw["id"].as_u64() else {
            return (Err(anyhow::anyhow!("Run has no ID")), 0);
        };
        run_jobs_counted(manager, repo, id, None, false)
    });
    let mut reads = resolved.discovery_reads + requests.len();
    for ((repo, raw), (jobs, job_reads)) in candidates.iter().zip(jobs) {
        reads += job_reads;
        let jobs = match jobs {
            Ok(jobs) => jobs,
            Err(error) => {
                resolved.messages.push(format!(
                    "Jobs for {repo} run {} are unavailable: {error}",
                    raw["id"]
                ));
                continue;
            }
        };
        let mut run = normalize_run(raw, repo);
        run["jobs"] = json!(jobs
            .iter()
            .map(|job| normalize_job(job, raw, repo, &records, false))
            .collect::<Vec<_>>());
        runs.push(run);
    }
    resolved.messages.push("Current work covers up to 20 running and 20 queued runs per repository. Queued jobs without a runner assignment are not attributed to a device.".into());
    sort_runs(&mut runs);
    let refresh = refresh_seconds(reads);
    refresh_notice(&mut resolved.messages, refresh);
    Ok(json!({"runs":runs,"message":resolved.messages.join(" "),"refresh_after_seconds":refresh}))
}
