//! GitHub JSON requests and safe published-log downloads through GitHub CLI.
use super::{commands::run_with_limit, Native};
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
        let bytes = body.map(|b| serde_json::to_vec(&b)).transpose()?;
        let reply = self
            .api
            .request(&self.gh, method, endpoint, bytes.as_deref(), false)?;
        if reply.body.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&reply.body).context("GitHub returned invalid or oversized JSON")
    }

    /// Fetches the signed-in user with the classic OAuth scopes GitHub reports in its headers.
    pub(super) fn user_with_scopes(&self) -> Result<(Value, Option<Vec<String>>)> {
        // Connection checks follow sign-in changes, so they never reuse a cached token.
        let reply = self.api.request(&self.gh, "GET", "/user", None, true)?;
        let user =
            serde_json::from_str(&reply.body).context("GitHub returned invalid account JSON")?;
        Ok((user, reply.scopes))
    }
}
