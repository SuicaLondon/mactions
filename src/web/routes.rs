//! API routes, request validation, and query decoding.
use crate::{
    activity::{self, Scope},
    core::{Create, Manager, Target},
    github::{self, Auth},
    logs,
};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::io::Read;
use tiny_http::{Method, Request};

pub(super) fn route(
    request: &mut Request,
    manager: &Manager,
    auth: &Auth,
) -> Result<(u16, &'static str, String)> {
    let url = request.url().to_string();
    let (path, query) = url.split_once('?').unwrap_or((&url, ""));
    let params = query_params(query)?;
    let param = |name: &str| {
        params
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.as_str())
    };
    if request.method() == &Method::Get {
        let scope = || Scope::new(param("organization"), param("repository"));
        let page = || param("page").unwrap_or("1").parse::<u64>();
        let result = match path {
            "/api/runners" => manager.list(param("local") != Some("1"))?,
            "/api/github/connection" => github::connection(manager),
            "/api/github/auth" => auth.status(),
            "/api/github/targets" => github::targets(
                manager,
                param("kind").unwrap_or("repo"),
                param("page").unwrap_or("1").parse()?,
            )?,
            "/api/activity/repositories" => activity::repositories(manager, &scope()?, page()?)?,
            "/api/activity/runners" => activity::runners(manager, &scope()?, page()?)?,
            "/api/activity/runs" => activity::runs_filtered(
                manager,
                &scope()?,
                page()?,
                param("runner_id").map(str::parse).transpose()?,
                param("status"),
            )?,
            "/api/activity/work" => activity::work(manager, &scope()?)?,
            "/api/activity/run" => {
                let scope = scope()?;
                activity::run(
                    manager,
                    scope.repository.as_deref().context("Choose a repository")?,
                    param("run_id").context("Choose a run")?.parse()?,
                    param("attempt").map(str::parse).transpose()?,
                )?
            }
            "/api/activity/run-graph" => {
                let scope = scope()?;
                activity::run_graph(
                    manager,
                    scope.repository.as_deref().context("Choose a repository")?,
                    param("run_id").context("Choose a run")?.parse()?,
                    param("attempt").map(str::parse).transpose()?,
                )?
            }
            "/api/activity/job" => {
                let scope = scope()?;
                activity::job(
                    manager,
                    scope.repository.as_deref().context("Choose a repository")?,
                    param("job_id").context("Choose a job")?.parse()?,
                )?
            }
            "/api/activity/job-history" => {
                let scope = scope()?;
                activity::job_history(
                    manager,
                    scope.repository.as_deref().context("Choose a repository")?,
                    param("workflow_id").context("Choose a workflow")?.parse()?,
                    param("job_name").context("Choose a job name")?,
                    page()?,
                )?
            }
            "/api/activity/job-logs" => {
                let scope = scope()?;
                github::repository_job_logs(
                    manager,
                    scope.repository.as_deref().context("Choose a repository")?,
                    param("job_id").context("Choose a job")?.parse()?,
                    param("step_number").map(str::parse).transpose()?,
                )?
            }
            _ => {
                let parts: Vec<_> = path.trim_start_matches('/').split('/').collect();
                if parts.len() != 4 || parts[0] != "api" || parts[1] != "runners" {
                    return Ok((
                        404,
                        "application/json",
                        json!({"error":"Not found"}).to_string(),
                    ));
                }
                let id = parts[2].parse()?;
                match parts[3] {
                    "logs" => logs::read(manager, id, param("file"))?,
                    "jobs" => github::jobs(manager, id, param("repository"))?,
                    "job-logs" => github::job_logs(
                        manager,
                        id,
                        param("repository"),
                        param("job_id").context("Choose a job")?.parse()?,
                        param("step_number").map(str::parse).transpose()?,
                    )?,
                    "capabilities" => github::capabilities(manager, &manager.get(id)?.target),
                    _ => {
                        return Ok((
                            404,
                            "application/json",
                            json!({"error":"Not found"}).to_string(),
                        ))
                    }
                }
            }
        };
        return Ok((200, "application/json; charset=utf-8", result.to_string()));
    }
    ensure!(request.method() == &Method::Post, "Unsupported HTTP method");
    // LAN callers intentionally need no credentials. This header prevents unrelated websites
    // from submitting cross-origin forms using the Mac's GitHub identity.
    ensure!(
        request
            .headers()
            .iter()
            .any(|h| h.field.equiv("X-Mactions") && h.value.as_str() == "1"),
        "Missing X-Mactions request header"
    );
    ensure!(
        request
            .headers()
            .iter()
            .any(|h| h.field.equiv("Content-Type")
                && h.value.as_str().starts_with("application/json")),
        "Expected application/json"
    );
    if let Some(origin) = request.headers().iter().find(|h| h.field.equiv("Origin")) {
        let host = request
            .headers()
            .iter()
            .find(|h| h.field.equiv("Host"))
            .context("Missing Host header")?
            .value
            .as_str();
        ensure!(
            [format!("http://{host}"), format!("https://{host}")]
                .contains(&origin.value.as_str().to_string()),
            "Cross-origin requests are not allowed"
        );
    }
    ensure!(
        request.body_length().unwrap_or(0) <= 16384,
        "Request body is too large"
    );
    let mut bytes = vec![];
    request.as_reader().take(16385).read_to_end(&mut bytes)?;
    ensure!(bytes.len() <= 16384, "Request body is too large");
    let payload: Value = serde_json::from_slice(&bytes)?;
    let result = if path == "/api/github/auth" {
        auth.start(
            manager,
            payload["organization_scope"].as_bool().unwrap_or(false),
        )?
    } else if path == "/api/github/auth/cancel" {
        auth.cancel()
    } else if path == "/api/github/check" {
        let target = Target::new(
            payload["kind"].as_str().context("Choose a target type")?,
            payload["target"].as_str().context("Choose a target")?,
        )?;
        github::capabilities(manager, &target)
    } else if path == "/api/runners" {
        let request: Create = serde_json::from_slice(&bytes)?;
        serde_json::to_value(manager.create(request)?)?
    } else {
        let parts: Vec<_> = path.trim_start_matches('/').split('/').collect();
        ensure!(
            parts.len() == 4 && parts[0] == "api" && parts[1] == "runners",
            "Unknown route"
        );
        let id = parts[2].parse::<u64>()?;
        let payload: Value = serde_json::from_slice(&bytes)?;
        if parts[3] == "delete" {
            ensure!(
                payload["confirm"].as_bool() == Some(true),
                "Deletion requires confirmation"
            );
        }
        let labels = if parts[3] == "labels" {
            serde_json::from_value(payload["labels"].clone())?
        } else {
            vec![]
        };
        manager.action_with_token(
            id,
            parts[3],
            &labels,
            payload["registration_token"].as_str(),
        )?
    };
    Ok((200, "application/json; charset=utf-8", result.to_string()))
}

fn query_params(query: &str) -> Result<Vec<(String, String)>> {
    fn decode(text: &str) -> Result<String> {
        let mut out = vec![];
        let mut chars = text.bytes();
        while let Some(b) = chars.next() {
            if b == b'%' {
                let a = chars.next().context("Invalid URL encoding")?;
                let b = chars.next().context("Invalid URL encoding")?;
                out.push(
                    ((a as char).to_digit(16).context("Invalid URL encoding")? * 16
                        + (b as char).to_digit(16).context("Invalid URL encoding")?)
                        as u8,
                );
            } else {
                out.push(if b == b'+' { b' ' } else { b });
            }
        }
        Ok(String::from_utf8(out)?)
    }
    query
        .split('&')
        .filter(|s| !s.is_empty())
        .map(|s| {
            let (k, v) = s.split_once('=').unwrap_or((s, ""));
            Ok((decode(k)?, decode(v)?))
        })
        .collect()
}
