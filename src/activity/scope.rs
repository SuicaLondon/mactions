//! Scope validation and repository discovery.
use super::read::{page_number, MAX_PAGES};
use crate::{
    core::{Manager, Runner, Target},
    github,
};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::collections::HashSet;

#[derive(Clone, Debug)]
pub struct Scope {
    pub organization: Option<String>,
    pub repository: Option<String>,
}

impl Scope {
    pub fn new(organization: Option<&str>, repository: Option<&str>) -> Result<Self> {
        let organization = organization
            .filter(|s| !s.trim().is_empty())
            .map(|s| Target::new("org", s).map(|t| t.name))
            .transpose()?;
        let repository = repository
            .filter(|s| !s.trim().is_empty())
            .map(|s| Target::new("repo", s).map(|t| t.name))
            .transpose()?;
        if let (Some(org), Some(repo)) = (&organization, &repository) {
            ensure!(
                repo.split('/')
                    .next()
                    .is_some_and(|owner| owner.eq_ignore_ascii_case(org)),
                "Choose a repository in the selected organization"
            );
        }
        Ok(Self {
            organization,
            repository,
        })
    }
}

/// A repository picker, with the same Target shape as the existing account picker.
pub fn repositories(manager: &Manager, scope: &Scope, page: u64) -> Result<Value> {
    page_number(page)?;
    if let Some(repo) = &scope.repository {
        return Ok(
            json!({"items":if page == 1 {vec![json!({"kind":"repo","name":repo})]} else {vec![]},"next_page":null}),
        );
    }
    let Some(org) = &scope.organization else {
        return github::targets(manager, "repo", page);
    };
    let response = manager.backend.api(
        "GET",
        &format!("/orgs/{org}/repos?per_page=100&type=all&sort=updated&page={page}"),
        None,
    )?;
    let rows = response
        .as_array()
        .context("Invalid GitHub repository list")?;
    let items: Vec<Value> = rows.iter().filter_map(|row| {
        let target = Target::new("repo", row["full_name"].as_str()?).ok()?;
        if !target.name.split('/').next()?.eq_ignore_ascii_case(org) { return None; }
        Some(json!({"kind":"repo","name":target.name,"private":row["private"].as_bool().unwrap_or(false)}))
    }).collect();
    Ok(
        json!({"items":items,"next_page":if rows.len() == 100 && page < MAX_PAGES {Some(page + 1)} else {None}}),
    )
}

pub(super) struct Resolved {
    pub(super) repositories: Vec<String>,
    pub(super) targets: Vec<Target>,
    pub(super) messages: Vec<String>,
    pub(super) discovery_reads: usize,
}

pub(super) fn resolve(manager: &Manager, scope: &Scope) -> Result<Resolved> {
    let mut resolved = Resolved {
        repositories: vec![],
        targets: vec![],
        messages: vec![],
        discovery_reads: 0,
    };
    let records = manager.records()?;
    if let Some(repo) = &scope.repository {
        resolved.repositories.push(repo.clone());
        resolved.targets.push(Target::new("repo", repo)?);
        return Ok(resolved);
    }
    if let Some(org) = &scope.organization {
        resolved.targets.push(Target::new("org", org)?);
    } else {
        resolved.messages.push("Scope includes repositories and organizations registered to managed runners on this device. Choose an organization or repository to browse another scope.".into());
        for runner in &records {
            if !resolved.targets.contains(&runner.target) {
                resolved.targets.push(runner.target.clone());
            }
        }
    }
    // Repository-scoped registrations do not authorize browsing all of their owner's repositories.
    let targets = resolved.targets.clone();
    for target in &targets {
        if target.kind == "repo" {
            resolved.repositories.push(target.name.clone());
            continue;
        }
        let org_scope = Scope::new(Some(&target.name), None)?;
        for page in 1..=MAX_PAGES {
            resolved.discovery_reads += 1;
            let data = match repositories(manager, &org_scope, page) {
                Ok(data) => data,
                Err(error) => {
                    resolved.messages.push(format!(
                        "Repository discovery for {} failed: {error}",
                        target.name
                    ));
                    break;
                }
            };
            for item in data["items"]
                .as_array()
                .context("Invalid repository picker")?
            {
                let repo = item["name"].as_str().context("Repository has no name")?;
                resolved.repositories.push(repo.to_string());
                let repo_target = Target::new("repo", repo)?;
                if !resolved.targets.contains(&repo_target) {
                    resolved.targets.push(repo_target);
                }
            }
            if data["next_page"].is_null() {
                if page == MAX_PAGES
                    && data["items"]
                        .as_array()
                        .is_some_and(|rows| rows.len() == 100)
                {
                    resolved.messages.push(format!(
                        "Repository discovery for {} is limited to 10,000 repositories.",
                        target.name
                    ));
                }
                break;
            }
        }
    }
    // Retain known repositories if organization discovery is temporarily unavailable.
    if let Some(org) = &scope.organization {
        for runner in &records {
            if runner.target.kind == "repo"
                && repository_owner(&runner.target.name).eq_ignore_ascii_case(org)
            {
                resolved.repositories.push(runner.target.name.clone());
                if !resolved.targets.contains(&runner.target) {
                    resolved.targets.push(runner.target.clone());
                }
            }
        }
    }
    let mut seen = HashSet::new();
    resolved
        .repositories
        .retain(|repo| seen.insert(repo.to_ascii_lowercase()));
    Ok(resolved)
}

pub(super) fn repository_owner(repository: &str) -> &str {
    repository.split('/').next().unwrap_or("")
}

pub(super) fn belongs_to_repository(runner: &Runner, repo: &str) -> bool {
    if runner.target.kind == "repo" {
        runner.target.name.eq_ignore_ascii_case(repo)
    } else {
        runner
            .target
            .name
            .eq_ignore_ascii_case(repository_owner(repo))
    }
}

pub(super) fn matches_scope(runner: &Runner, scope: &Scope) -> bool {
    if let Some(repo) = &scope.repository {
        return belongs_to_repository(runner, repo);
    }
    scope.organization.as_ref().is_none_or(|org| {
        if runner.target.kind == "org" {
            runner.target.name.eq_ignore_ascii_case(org)
        } else {
            repository_owner(&runner.target.name).eq_ignore_ascii_case(org)
        }
    })
}
