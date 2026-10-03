//! Resolve the executed workflow file, then read only its immutable revision.
use crate::core::{Manager, Target};
use anyhow::{ensure, Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::{json, Value};

pub(super) const MAX_SOURCE_BYTES: usize = 256 * 1024;
const FILE_QUERY: &str = "query($id:ID!){node(id:$id){... on WorkflowRun {id url runAttempt file{path repositoryName repositoryFileUrl}}}}";

#[derive(Serialize)]
pub(super) struct Source {
    pub repository: String,
    pub path: String,
    pub sha: String,
    pub run_attempt: u64,
    pub url: String,
}

fn encode_path(path: &str) -> String {
    let mut encoded = String::new();
    for byte in path.bytes() {
        if byte.is_ascii_alphanumeric() || b"-._~/".contains(&byte) {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

pub(super) fn resolve(manager: &Manager, repository: &str, raw: &Value) -> Result<Source> {
    let node_id = raw["node_id"]
        .as_str()
        .context("The run has no workflow reference")?;
    let run_id = raw["id"].as_u64().context("The run has no ID")?;
    let attempt = raw["run_attempt"]
        .as_u64()
        .context("The run has no attempt")?;
    let response = manager.backend.api(
        "POST",
        "/graphql",
        Some(json!({
            "query": FILE_QUERY, "variables": {"id": node_id}
        })),
    )?;
    ensure!(
        response["errors"].as_array().is_none_or(Vec::is_empty),
        "GitHub could not resolve the executed workflow file"
    );
    let node = &response["data"]["node"];
    ensure!(
        node["id"].as_str() == Some(node_id)
            && node["url"]
                .as_str()
                .is_some_and(|url| url.eq_ignore_ascii_case(&format!(
                    "https://github.com/{repository}/actions/runs/{run_id}"
                )))
            && node["runAttempt"]
                .as_u64()
                .is_some_and(|current| current >= attempt),
        "GitHub returned a different workflow run"
    );
    // WorkflowRunFile identifies the executed root file. Re-runs retain the original
    // root workflow revision; referenced reusable workflows can differ and are not expanded.
    let file = &node["file"];
    let repository = Target::new(
        "repo",
        file["repositoryName"]
            .as_str()
            .context("The executed workflow repository is unavailable")?,
    )?
    .name;
    let path = file["path"]
        .as_str()
        .context("The executed workflow path is unavailable")?;
    let name = path
        .strip_prefix(".github/workflows/")
        .context("This run has no repository workflow definition")?;
    ensure!(
        !name.is_empty()
            && !name.contains('/')
            && !name.chars().any(char::is_control)
            && (name.ends_with(".yml") || name.ends_with(".yaml")),
        "The executed workflow path is invalid"
    );
    let prefix = format!("https://github.com/{repository}/blob/");
    let url = file["repositoryFileUrl"]
        .as_str()
        .context("The executed workflow revision is unavailable")?;
    let (sha, url_path) = url
        .strip_prefix(&prefix)
        .and_then(|tail| tail.split_once('/'))
        .context("The executed workflow revision is not a verified GitHub source")?;
    ensure!(
        sha.len() == 40 && sha.bytes().all(|byte| byte.is_ascii_hexdigit()),
        "GitHub did not provide an immutable workflow revision"
    );
    ensure!(
        url_path == encode_path(path) || url_path == path,
        "The executed workflow source paths do not match"
    );
    Ok(Source {
        repository,
        path: path.into(),
        sha: sha.into(),
        run_attempt: attempt,
        url: url.into(),
    })
}

pub(super) fn read(manager: &Manager, source: &Source) -> Result<String> {
    let response = manager.backend.api(
        "GET",
        &format!(
            "/repos/{}/contents/{}?ref={}",
            source.repository,
            encode_path(&source.path),
            source.sha
        ),
        None,
    )?;
    ensure!(
        response["type"] == "file" && response["path"] == source.path,
        "GitHub did not return the executed workflow file"
    );
    let size = response["size"]
        .as_u64()
        .context("The workflow file size is unavailable")?;
    ensure!(
        size <= MAX_SOURCE_BYTES as u64,
        "This workflow exceeds the 256 KiB graph limit"
    );
    ensure!(
        response["encoding"] == "base64",
        "The workflow file content is unavailable"
    );
    let encoded = response["content"]
        .as_str()
        .context("The workflow file content is unavailable")?;
    ensure!(
        encoded.len() <= MAX_SOURCE_BYTES * 2,
        "This workflow exceeds the 256 KiB graph limit"
    );
    let compact: Vec<u8> = encoded
        .bytes()
        .filter(|byte| !byte.is_ascii_whitespace())
        .collect();
    let decoded = STANDARD
        .decode(compact)
        .context("GitHub returned invalid workflow content")?;
    ensure!(
        decoded.len() == size as usize,
        "GitHub returned an incomplete workflow file"
    );
    String::from_utf8(decoded).context("The workflow file is not UTF-8")
}
