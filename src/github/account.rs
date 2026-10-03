//! Account connection, accessible targets, and capability checks.
use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};

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

#[cfg(test)]
#[path = "tests/account.rs"]
mod tests;
