use anyhow::{ensure, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Target {
    pub kind: String,
    pub name: String,
}
impl Target {
    pub fn new(kind: &str, name: &str) -> Result<Self> {
        ensure!(
            kind == "repo" || kind == "org",
            "Target kind must be repo or org"
        );
        let name = name
            .trim()
            .trim_start_matches("https://github.com/")
            .trim_end_matches('/');
        let parts: Vec<_> = name.split('/').collect();
        ensure!(
            parts.len() == if kind == "repo" { 2 } else { 1 },
            "Use owner/repository for a repo or an organization name for an org"
        );
        ensure!(
            parts.iter().all(|s| !s.is_empty()
                && *s != "."
                && *s != ".."
                && s.len() <= 100
                && s.bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"-_.".contains(&c))),
            "Invalid GitHub target"
        );
        Ok(Self {
            kind: kind.into(),
            name: name.into(),
        })
    }
    pub fn api(&self) -> String {
        format!(
            "/{}/{}/actions/runners",
            if self.kind == "repo" { "repos" } else { "orgs" },
            self.name
        )
    }
    pub fn url(&self) -> String {
        format!("https://github.com/{}", self.name)
    }
}

pub fn labels(input: &[String]) -> Result<Vec<String>> {
    let mut result = Vec::<String>::new();
    ensure!(
        input.len() <= 100,
        "At most 100 custom labels are supported"
    );
    for item in input {
        let item = item.trim();
        ensure!(
            !item.is_empty()
                && item.len() <= 100
                && !item.contains(',')
                && !item.chars().any(char::is_control),
            "Labels must contain 1–100 bytes, without commas or control characters"
        );
        ensure!(
            ![
                "self-hosted",
                "macos",
                "linux",
                "windows",
                "arm",
                "arm64",
                "x64"
            ]
            .iter()
            .any(|s| item.eq_ignore_ascii_case(s)),
            "GitHub default labels are read-only: {item}"
        );
        if !result.iter().any(|s| s.eq_ignore_ascii_case(item)) {
            result.push(item.to_owned());
        }
    }
    Ok(result)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Runner {
    pub id: u64,
    pub name: String,
    pub target: Target,
    pub labels: Vec<String>,
    pub path: PathBuf,
    pub version: Option<String>,
    pub github_id: Option<u64>,
    pub enabled: bool,
    pub phase: String,
    pub error: Option<String>,
    #[serde(default)]
    pub deregistered: bool,
    #[serde(default)]
    pub registration_attempted: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Create {
    pub kind: String,
    pub target: String,
    #[serde(default = "default_prefix")]
    pub prefix: String,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub registration_token: Option<String>,
}
fn default_prefix() -> String {
    "mactions".into()
}
