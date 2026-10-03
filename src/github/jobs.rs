//! Legacy runner-scoped job view and repository validation.
use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::collections::HashSet;

pub(super) fn job_repository(target: &Target, repository: Option<&str>) -> Result<Option<String>> {
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
