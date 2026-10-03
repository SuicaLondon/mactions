//! Normalize GitHub records and attribute jobs to local runner identities.
use super::scope::belongs_to_repository;
use crate::core::Runner;
use serde_json::{json, Value};

fn local_identity<'a>(records: &'a [Runner], id: Option<u64>, repo: &str) -> Option<&'a Runner> {
    let id = id.filter(|id| *id > 0)?;
    records
        .iter()
        .find(|r| !r.deregistered && r.github_id == Some(id) && belongs_to_repository(r, repo))
}

pub(super) fn label_names(row: &Value) -> Vec<String> {
    row["labels"]
        .as_array()
        .map(|labels| {
            labels
                .iter()
                .filter_map(|label| {
                    label
                        .as_str()
                        .or_else(|| label["name"].as_str())
                        .map(str::to_string)
                })
                .collect()
        })
        .unwrap_or_default()
}

fn host_type(row: &Value, local: bool) -> &'static str {
    if local
        || label_names(row)
            .iter()
            .any(|label| label.eq_ignore_ascii_case("self-hosted"))
    {
        return "self-hosted";
    }
    match row["host_type"]
        .as_str()
        .or_else(|| row["runner_type"].as_str())
    {
        Some("self-hosted") => "self-hosted",
        Some("github-hosted") => "github-hosted",
        _ => "unknown",
    }
}

pub(super) fn normalize_run(raw: &Value, repo: &str) -> Value {
    json!({"id":raw["id"],"repository":repo,"workflow_id":raw["workflow_id"],"name":raw["name"].as_str().unwrap_or("Workflow"),
        "title":raw["display_title"].as_str().or_else(|| raw["name"].as_str()).unwrap_or("Workflow run"),"number":raw["run_number"],"attempt":raw["run_attempt"],
        "status":raw["status"].as_str().unwrap_or("unknown"),"conclusion":raw["conclusion"],"branch":raw["head_branch"].as_str().unwrap_or(""),
        "head_sha":raw["head_sha"].as_str().unwrap_or(""),"url":raw["html_url"].as_str().map(str::to_string)
            .unwrap_or_else(|| format!("https://github.com/{repo}/actions/runs/{}",raw["id"])),
        "created_at":raw["created_at"],"started_at":raw["run_started_at"],"updated_at":raw["updated_at"],
        "event":raw["event"],"actor":raw["actor"]["login"],"triggering_actor":raw["triggering_actor"]["login"],
        "commit_message":raw["head_commit"]["message"],"workflow_path":raw["path"]})
}

pub(super) fn normalize_job(
    raw: &Value,
    run: &Value,
    repo: &str,
    records: &[Runner],
    steps: bool,
) -> Value {
    let local = local_identity(records, raw["runner_id"].as_u64(), repo);
    let id = raw["id"].clone();
    let mut job = raw.clone();
    if let Some(object) = job.as_object_mut() {
        object.remove("steps");
    }
    job["id"] = id;
    job["name"] = json!(raw["name"].as_str().unwrap_or("Job"));
    job["status"] = json!(raw["status"].as_str().unwrap_or("unknown"));
    job["repository"] = json!(repo);
    job["workflow_id"] = run["workflow_id"].clone();
    job["workflow"] = json!(run["name"].as_str().unwrap_or("Workflow"));
    job["branch"] = json!(run["head_branch"].as_str().unwrap_or(""));
    job["run_id"] = run["id"].clone();
    job["run_number"] = run["run_number"].clone();
    job["run_attempt"] = raw["run_attempt"]
        .as_u64()
        .map(|a| json!(a))
        .unwrap_or_else(|| run["run_attempt"].clone());
    job["run_url"] = json!(format!(
        "https://github.com/{repo}/actions/runs/{}",
        run["id"]
    ));
    job["run_title"] = run["display_title"].clone();
    job["event"] = run["event"].clone();
    job["actor"] = run["actor"]["login"].clone();
    job["triggering_actor"] = run["triggering_actor"]["login"].clone();
    job["head_sha"] = run["head_sha"].clone();
    job["commit_message"] = run["head_commit"]["message"].clone();
    job["workflow_path"] = run["path"].clone();
    job["workflow_url"] = run["workflow_id"]
        .as_u64()
        .map(|id| json!(format!("https://github.com/{repo}/actions/workflows/{id}")))
        .unwrap_or(Value::Null);
    job["url"] = raw["html_url"]
        .as_str()
        .map(|url| json!(url))
        .unwrap_or_else(|| {
            json!(format!(
                "https://github.com/{repo}/actions/runs/{}/job/{}",
                run["id"], raw["id"]
            ))
        });
    job["labels"] = json!(label_names(raw));
    job["local_id"] = json!(local.map(|r| r.id));
    job["host_type"] = json!(host_type(raw, local.is_some()));
    let assigned = raw["runner_id"].as_u64().is_some_and(|id| id > 0);
    job["device"] = json!(if local.is_some() {
        "this_device"
    } else if assigned {
        "other_device"
    } else {
        "unknown"
    });
    if steps {
        job["steps"] = json!(raw["steps"].as_array().cloned().unwrap_or_default());
    }
    job
}
