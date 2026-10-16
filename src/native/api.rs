//! GitHub REST transport over one keep-alive HTTPS pool, authenticated with the CLI's token.
use super::commands::run;
use anyhow::{bail, Context, Result};
use std::{
    path::Path,
    process::Command,
    sync::Mutex,
    time::{Duration, Instant},
};
use ureq::{
    config::RedirectAuthHeaders,
    http::{self, Response},
    tls::{RootCerts, TlsConfig, TlsProvider},
    Agent, Body, Proxy,
};

const API_VERSION: &str = "2022-11-28";
const RESPONSE_LIMIT: u64 = 2 * 1024 * 1024;
// Reread the token so sign-in changes made with `gh auth` apply without restarting the manager.
const TOKEN_TTL: Duration = Duration::from_secs(60);
const AUTH_MISSING: &str =
    "GitHub authentication is missing or expired. Run `mactions auth login` on this Mac";

pub(super) struct Api {
    base: String,
    agent: Agent,
    token: Mutex<Option<(String, Instant)>>,
}

pub(super) struct Reply {
    pub(super) body: String,
    /// Classic OAuth tokens list their scopes; fine-grained and app tokens omit the header.
    pub(super) scopes: Option<Vec<String>>,
}

struct Failure<'a> {
    status: u16,
    needed_scopes: &'a str,
    granted_scopes: &'a str,
    sso: bool,
    body: &'a str,
}

impl Api {
    pub(super) fn new(base: impl Into<String>) -> Self {
        Self::with_proxy(base, Proxy::try_from_env())
    }

    /// ureq never bypasses a proxy for loopback, so test servers are reached directly.
    #[cfg(test)]
    pub(super) fn without_proxy(base: impl Into<String>) -> Self {
        Self::with_proxy(base, None)
    }

    fn with_proxy(base: impl Into<String>, proxy: Option<Proxy>) -> Self {
        let tls = TlsConfig::builder()
            .provider(TlsProvider::NativeTls)
            .root_certs(RootCerts::PlatformVerifier)
            .build();
        let agent = Agent::config_builder()
            .http_status_as_error(false)
            .tls_config(tls)
            .proxy(proxy)
            .timeout_global(Some(Duration::from_secs(45)))
            // Keep a warm connection for each parallel activity reader. The pool-wide limit
            // defaults to 10 and would otherwise cap the per-host one.
            .max_idle_connections(16)
            .max_idle_connections_per_host(16)
            .max_idle_age(Duration::from_secs(60))
            .redirect_auth_headers(RedirectAuthHeaders::SameHost)
            .user_agent(concat!("mactions/", env!("CARGO_PKG_VERSION")))
            .build()
            .into();
        Self {
            base: base.into(),
            agent,
            token: Mutex::new(None),
        }
    }

    /// Sends one request, rereading the token once if GitHub rejects a cached one.
    pub(super) fn request(
        &self,
        gh: &Path,
        method: &str,
        endpoint: &str,
        body: Option<&[u8]>,
        fresh_token: bool,
    ) -> Result<Reply> {
        let mut response = self.send(&self.token(gh, fresh_token)?, method, endpoint, body)?;
        if response.status() == 401 && !fresh_token {
            response = self.send(&self.token(gh, true)?, method, endpoint, body)?;
        }
        let header = |name: &str| {
            response
                .headers()
                .get(name)
                .and_then(|value| value.to_str().ok())
                .unwrap_or_default()
                .to_owned()
        };
        let status = response.status().as_u16();
        let granted_scopes = header("x-oauth-scopes");
        let needed_scopes = header("x-accepted-oauth-scopes");
        let scopes = response
            .headers()
            .contains_key("x-oauth-scopes")
            .then(|| scope_list(&granted_scopes));
        let sso = response.headers().contains_key("x-github-sso");
        let text = response
            .body_mut()
            .with_config()
            .limit(RESPONSE_LIMIT)
            .read_to_string();
        if !(200..300).contains(&status) {
            bail!(failure_message(&Failure {
                status,
                needed_scopes: &needed_scopes,
                granted_scopes: &granted_scopes,
                sso,
                body: &text.unwrap_or_default(),
            }));
        }
        let body = text.context("GitHub returned invalid or oversized JSON")?;
        Ok(Reply { body, scopes })
    }

    fn send(
        &self,
        token: &str,
        method: &str,
        endpoint: &str,
        body: Option<&[u8]>,
    ) -> Result<Response<Body>> {
        let request = http::Request::builder()
            .method(method)
            .uri(format!(
                "{}/{}",
                self.base,
                endpoint.trim_start_matches('/')
            ))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", API_VERSION)
            .header("Authorization", format!("token {token}"));
        let result = match body {
            Some(bytes) => self.agent.run(
                request
                    .header("Content-Type", "application/json")
                    .body(bytes)?,
            ),
            None if matches!(method, "GET" | "HEAD" | "DELETE") => {
                self.agent.run(request.body(())?)
            }
            // Send an explicit empty body; GitHub rejects bodyless POSTs without a length.
            None => self.agent.run(request.body(&[][..])?),
        };
        result.context(
            "GitHub request failed. Check connectivity, API rate limits, and authorization, then retry",
        )
    }

    /// Reads the token from GitHub CLI, which owns sign-in and keychain storage.
    fn token(&self, gh: &Path, fresh: bool) -> Result<String> {
        let mut cached = self
            .token
            .lock()
            .map_err(|_| anyhow::anyhow!("GitHub token cache is unavailable"))?;
        if let Some((token, read)) = cached.as_ref() {
            if !fresh && read.elapsed() < TOKEN_TTL {
                return Ok(token.clone());
            }
        }
        let mut command = Command::new(gh);
        command
            .args(["auth", "token", "--hostname", "github.com"])
            .env("GH_PROMPT_DISABLED", "1");
        let output = run(&mut command, None, Duration::from_secs(15))?;
        let token = output.text.trim();
        if !output.ok || token.is_empty() || token.contains(char::is_whitespace) {
            *cached = None;
            bail!(AUTH_MISSING);
        }
        *cached = Some((token.to_owned(), Instant::now()));
        Ok(token.to_owned())
    }
}

fn failure_message(failure: &Failure) -> &'static str {
    if failure.status == 401 {
        return AUTH_MISSING;
    }
    if missing_scope(failure).as_deref() == Some("admin:org") {
        return "The GitHub CLI login lacks the admin:org scope required for organization runners. Authorize GitHub again with \"Request organization runner management access\" selected, or run `gh auth refresh -h github.com -s admin:org` on this Mac";
    }
    if failure.sso || failure.body.contains("SAML") || failure.body.contains("SSO") {
        return "GitHub requires SSO authorization. Sign in to your organization on GitHub, authorize GitHub CLI, then check again";
    }
    if failure.body.contains("OAuth App access restrictions")
        || failure.body.contains("organization approval")
    {
        return "Organization approval is required. Ask an organization owner to approve GitHub CLI, then check again";
    }
    if matches!(failure.status, 403 | 404) {
        // A 404 can hide an inaccessible repository; it is never sufficient proof of deletion.
        return "GitHub denied access or could not find the target. Check the target and runner administration permissions (repository Administration or organization Self-hosted runners). SSO or organization approval may also be required";
    }
    "GitHub request failed. Check connectivity, API rate limits, and authorization, then retry"
}

/// Mirrors GitHub CLI's scope suggestion: a client error names a scope the token lacks.
fn missing_scope(failure: &Failure) -> Option<String> {
    if !(400..500).contains(&failure.status) || failure.status == 422 {
        return None;
    }
    if failure.granted_scopes.trim().is_empty() {
        return None;
    }
    let mut granted = vec![];
    for scope in scope_list(failure.granted_scopes) {
        // admin: implies write: and read:, and write: implies read:.
        if let Some(name) = scope.strip_prefix("admin:") {
            granted.extend([format!("write:{name}"), format!("read:{name}")]);
        } else if let Some(name) = scope.strip_prefix("write:") {
            granted.push(format!("read:{name}"));
        }
        granted.push(scope);
    }
    scope_list(failure.needed_scopes)
        .into_iter()
        .find(|scope| !granted.contains(scope))
}

fn scope_list(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|scope| !scope.is_empty())
        .map(String::from)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{failure_message, Api, Failure};
    use std::{io::Write, net::TcpListener, thread};

    #[test]
    fn https_uses_the_platform_tls_provider() {
        // A missing TLS feature panics in ureq; a non-TLS peer must instead fail the request.
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let _ = stream.write_all(b"HTTP/1.1 400 Not TLS\r\n\r\n");
        });
        let api = Api::without_proxy(format!("https://127.0.0.1:{port}"));
        let error = api
            .send("fixture-token", "GET", "/user", None)
            .unwrap_err()
            .to_string();
        assert!(error.contains("GitHub request failed"));
    }

    fn message(status: u16, needed: &str, granted: &str, body: &str) -> &'static str {
        failure_message(&Failure {
            status,
            needed_scopes: needed,
            granted_scopes: granted,
            sso: false,
            body,
        })
    }

    #[test]
    fn scope_hint_follows_github_cli_implications() {
        assert!(message(403, "admin:org", "repo, gist", "").contains("admin:org scope"));
        assert!(message(403, "admin:org", "repo, admin:org", "").contains("denied access"));
        assert!(message(404, "read:org", "admin:org", "").contains("denied access"));
        assert!(message(403, "admin:org", "", "").contains("denied access"));
        assert!(message(422, "admin:org", "repo", "").contains("request failed"));
    }

    #[test]
    fn organization_policies_are_named_before_generic_denials() {
        assert!(message(
            403,
            "",
            "repo",
            r#"{"message":"Resource protected by organization SAML enforcement."}"#
        )
        .contains("SSO"));
        assert!(message(
            403,
            "",
            "repo",
            r#"{"message":"the org has enabled OAuth App access restrictions"}"#
        )
        .contains("Organization approval"));
        assert!(message(401, "", "", "").contains("mactions auth login"));
        assert!(message(502, "", "", "").contains("request failed"));
    }
}
