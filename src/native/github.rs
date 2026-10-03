//! GitHub CLI transport and safe published-log downloads.
use super::{
    commands::{run, run_with_limit},
    Native,
};
use anyhow::{bail, ensure, Context, Result};
use serde_json::Value;
use std::{process::Command, time::Duration};

pub(super) fn download_log(command: &mut Command) -> Result<String> {
    command
        .env("GH_PROMPT_DISABLED", "1")
        .env("GH_PAGER", "cat")
        .env("NO_COLOR", "1")
        .env("CLICOLOR", "0")
        .env_remove("GH_FORCE_TTY")
        .env_remove("GH_DEBUG")
        .env_remove("DEBUG");
    // gh follows GitHub's short-lived download redirect. Logs are never persisted.
    // Keep memory bounded, but never present a retained prefix as a complete log.
    let output = run_with_limit(command, None, Duration::from_secs(90), 16 * 1024 * 1024)
        .context("Could not download GitHub logs. Open the job on GitHub or retry")?;
    if !output.ok {
        if output.text.contains("is still in progress") {
            bail!("GitHub has not published this step's archive because its workflow is still running. Open the complete job log or view live output on GitHub");
        }
        if output.text.contains("HTTP 404") || output.text.contains("HTTP 410") {
            bail!("GitHub has not published this log or it has expired. Open the job on GitHub or retry later");
        }
        if output.text.contains("HTTP 401") || output.text.contains("gh auth login") {
            bail!("GitHub authentication is missing or expired. Sign in again to download logs");
        }
        if output.text.contains("HTTP 403")
            || output.text.contains("SAML")
            || output.text.contains("SSO")
        {
            bail!("GitHub denied log access. Check Actions read permission, organization SSO, and API rate limits");
        }
        // Do not expose raw CLI output: a failed response can contain a signed URL or log data.
        bail!("GitHub log download failed. Check connectivity and Actions read permission, or open the job on GitHub");
    }
    ensure!(
        !output.truncated,
        "This log exceeds the 16 MiB inline viewing limit. Open the job on GitHub to view or download the complete log"
    );
    Ok(output.text)
}

impl Native {
    pub(super) fn api_page(
        &self,
        method: &str,
        endpoint: &str,
        body: Option<Value>,
    ) -> Result<Value> {
        let mut command = Command::new(&self.gh);
        command.args([
            "api",
            "--hostname",
            "github.com",
            "--method",
            method,
            "-H",
            "Accept: application/vnd.github+json",
            "-H",
            "X-GitHub-Api-Version: 2022-11-28",
            endpoint,
        ]);
        command
            .env("GH_PROMPT_DISABLED", "1")
            .env("GH_PAGER", "cat");
        let bytes = body.map(|b| serde_json::to_vec(&b)).transpose()?;
        if bytes.is_some() {
            command.args(["--input", "-"]);
        }
        let output = run(&mut command, bytes.as_deref(), Duration::from_secs(45))?;
        if !output.ok {
            if output.text.contains("HTTP 401")
                || output.text.contains("gh auth login")
                || output.text.contains("GH_TOKEN")
            {
                bail!("GitHub authentication is missing or expired. Run `mactions auth login` on this Mac");
            }
            if output.text.contains("SAML") || output.text.contains("SSO") {
                bail!("GitHub requires SSO authorization. Sign in to your organization on GitHub, authorize GitHub CLI, then check again");
            }
            if output.text.contains("OAuth App access restrictions")
                || output.text.contains("organization approval")
            {
                bail!("Organization approval is required. Ask an organization owner to approve GitHub CLI, then check again");
            }
            if output.text.contains("HTTP 403") || output.text.contains("HTTP 404") {
                // A 404 can hide an inaccessible repository; it is never sufficient proof of deletion.
                bail!("GitHub denied access or could not find the target. Check the target and runner administration permissions (repository Administration or organization Self-hosted runners). SSO or organization approval may also be required");
            }
            bail!("GitHub request failed. Check connectivity, API rate limits, and authorization, then retry");
        }
        if output.text.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&output.text).context("GitHub returned invalid or oversized JSON")
    }
}
