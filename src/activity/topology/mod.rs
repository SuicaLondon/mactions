//! Source-defined workflow dependencies, loaded independently of run status.
mod definition;
mod source;

use super::jobs::run_jobs;
use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};

/// Fetch the selected attempt's topology without inferring edges from runtime order.
pub fn run_graph(
    manager: &Manager,
    repository: &str,
    run_id: u64,
    attempt: Option<u64>,
) -> Result<Value> {
    let repository = Target::new("repo", repository)?.name;
    ensure!(
        run_id > 0 && attempt.is_none_or(|number| number > 0),
        "Choose a valid run and attempt"
    );
    let endpoint = attempt.map_or_else(
        || format!("/repos/{repository}/actions/runs/{run_id}"),
        |number| format!("/repos/{repository}/actions/runs/{run_id}/attempts/{number}"),
    );
    let raw = manager.backend.api("GET", &endpoint, None)?;
    ensure!(
        raw["id"].as_u64() == Some(run_id),
        "GitHub returned a different run"
    );
    let resolved_attempt = raw["run_attempt"]
        .as_u64()
        .filter(|value| *value > 0)
        .context("The run has no attempt")?;
    ensure!(
        attempt.is_none_or(|number| number == resolved_attempt),
        "GitHub returned a different run attempt"
    );
    let jobs = run_jobs(manager, &repository, run_id, Some(resolved_attempt), false)?;
    let mut source = None;
    let result = (|| {
        source = Some(source::resolve(manager, &repository, &raw)?);
        let yaml = source::read(manager, source.as_ref().unwrap())?;
        definition::graph(&yaml, &jobs)
    })();
    match result {
        Ok((nodes, unmapped, partial)) => Ok(json!({
            "state": if partial { "partial" } else { "complete" },
            "message": if partial {
                "Dependencies come from the executed workflow. Some runtime jobs cannot be matched safely; reusable workflow internals are not expanded."
            } else { "" },
            "nodes": nodes, "unmapped_job_ids": unmapped, "source": source,
        })),
        Err(error) => Ok(json!({
            "state": "unavailable", "message": format!("Workflow graph unavailable: {error}"),
            "nodes": [], "unmapped_job_ids": jobs.iter().filter_map(|job| job["id"].as_u64()).collect::<Vec<_>>(),
            "source": source,
        })),
    }
}

#[cfg(test)]
mod tests;
