use super::{
    commands::checked,
    test_api::{serve, Reply, Seen},
    Native,
};
use crate::core::{Backend, Runner};
use serde_json::json;
use std::os::unix::fs::PermissionsExt;
use std::{
    fs,
    path::Path,
    process::Command,
    sync::{Arc, Mutex},
};
use tempfile::TempDir;

fn fixture(script: &str) -> (TempDir, Native) {
    api_fixture(script, |_| Reply::status(500, "unexpected API request"))
}

fn api_fixture(
    script: &str,
    handler: impl Fn(&Seen) -> Reply + Send + 'static,
) -> (TempDir, Native) {
    let root = TempDir::new().unwrap();
    let gh = root.path().join("gh");
    fs::write(
        &gh,
        format!(
            "#!/bin/bash\nset -eu\ncd '{}'\nif [ \"$1\" = auth ]; then printf '%s\\n' \"$*\" >> token-reads; echo fixture-token; exit; fi\n{script}\n",
            root.path().display()
        ),
    )
    .unwrap();
    fs::set_permissions(&gh, fs::Permissions::from_mode(0o755)).unwrap();
    let native = Native::with_api_base(root.path().into(), gh, &serve(handler));
    (root, native)
}
#[test]
fn all_pages_are_used_for_name_and_identity_lookup() {
    let (root, native) = api_fixture("exit 1", |seen| {
        assert_eq!(seen.authorization, "token fixture-token");
        assert_eq!(seen.api_version, "2022-11-28");
        if seen.path.ends_with("page=1") {
            return Reply::json(
                json!({"runners":(0..100).map(|id|json!({"id":id})).collect::<Vec<_>>()}),
            );
        }
        Reply::json(json!({"runners":[{"id":101,"name":"last-page"}]}))
    });
    let result = native
        .api("GET", "/orgs/example/actions/runners?per_page=100", None)
        .unwrap();
    assert_eq!(result["runners"].as_array().unwrap().len(), 101);
    assert_eq!(result["runners"][100]["name"], "last-page");
    // Both pages reuse one token read from GitHub CLI.
    let reads = fs::read_to_string(root.path().join("token-reads")).unwrap();
    assert_eq!(reads, "auth token --hostname github.com\n");
}
#[test]
fn inaccessible_target_does_not_count_as_successful_deregistration() {
    let (_root, native) = api_fixture("exit 1", |_| {
        Reply::status(404, r#"{"message":"Not Found"}"#)
    });
    assert!(native
        .api("DELETE", "/repos/example/build/actions/runners/42", None)
        .unwrap_err()
        .to_string()
        .contains("permissions"));
}
#[test]
fn deletion_is_idempotent_only_after_an_authenticated_list() {
    let methods = Arc::new(Mutex::new(vec![]));
    let seen_methods = methods.clone();
    let (_root, native) = api_fixture("exit 1", move |seen| {
        seen_methods.lock().unwrap().push(seen.method.clone());
        Reply::json(json!({"runners":[]}))
    });
    native
        .api("DELETE", "/repos/example/build/actions/runners/42", None)
        .unwrap();
    assert_eq!(*methods.lock().unwrap(), ["GET"]);
}
#[test]
fn recovers_official_runner_identity_with_utf8_bom() {
    let (root, native) = fixture("exit 0");
    let path = root.path().join("actions-runner-1");
    fs::create_dir(&path).unwrap();
    let runner = Runner {
        id: 1,
        name: "fixture-1".into(),
        target: crate::core::Target::new("repo", "example/build").unwrap(),
        labels: vec![],
        path,
        version: None,
        github_id: None,
        enabled: false,
        phase: "registering".into(),
        error: None,
        deregistered: false,
        registration_attempted: true,
    };
    for prefix in ["\u{feff}", ""] {
        fs::write(runner.path.join(".runner"), format!("{}{}", prefix, r#"{"agentId":42,"agentName":"fixture-1","gitHubUrl":"https://github.com/example/build"}"#)).unwrap();
        assert_eq!(native.recover_registration(&runner).unwrap(), Some(42));
    }
}
#[test]
fn configuration_errors_redact_registration_tokens() {
    let (root, native) = api_fixture("exit 1", |seen| {
        assert_eq!(seen.method, "POST");
        assert!(seen.body.is_empty());
        Reply::json(json!({"token":"secret-fixture-token"}))
    });
    let path = root.path().join("actions-runner-1");
    fs::create_dir(&path).unwrap();
    fs::write(
        path.join("config.sh"),
        "#!/bin/bash\nprintf '%s' \"$ACTIONS_RUNNER_INPUT_TOKEN\"\nexit 1\n",
    )
    .unwrap();
    fs::set_permissions(path.join("config.sh"), fs::Permissions::from_mode(0o755)).unwrap();
    let runner = Runner {
        id: 1,
        name: "fixture-1".into(),
        target: crate::core::Target::new("repo", "example/build").unwrap(),
        labels: vec![],
        path,
        version: None,
        github_id: None,
        enabled: false,
        phase: "registering".into(),
        error: None,
        deregistered: false,
        registration_attempted: true,
    };
    let error = native.configure(&runner).unwrap_err().to_string();
    assert!(error.contains("[redacted]"));
    assert!(!error.contains("secret-fixture-token"));
}
#[test]
fn output_capture_is_bounded_without_blocking_the_child() {
    let result = checked(
        Command::new("/bin/sh").args(["-c", "yes fixture | head -c 3000000"]),
        10,
    )
    .unwrap();
    assert_eq!(result.len(), 2 * 1024 * 1024);
}

#[test]
fn job_log_downloads_exceed_management_cap_but_never_silently_truncate() {
    let (_root, native) = fixture("yes fixture | head -c 3000000");
    assert_eq!(
        native.job_logs("example/build", 70, None).unwrap().len(),
        3_000_000
    );
    let (_root, native) = fixture("yes fixture | head -c 17000000");
    let error = native
        .job_logs("example/build", 70, Some(0))
        .unwrap_err()
        .to_string();
    assert!(error.contains("16 MiB"));
    assert!(error.contains("complete log"));
    assert!(!error.contains("fixture"));
}

#[test]
fn log_download_failure_never_exposes_raw_cli_output() {
    let (_root, native) =
        fixture("echo 'private-output signed-download-url'; echo 'HTTP 403' >&2; exit 1");
    let error = native
        .job_logs("example/build", 70, None)
        .unwrap_err()
        .to_string();
    assert!(error.contains("Actions read permission"));
    assert!(!error.contains("private-output"));
    assert!(!error.contains("signed-download-url"));
}

#[test]
fn missing_organization_scope_explains_how_to_authorize() {
    let (_root, native) = api_fixture("exit 1", |_| {
        Reply::status(
            403,
            r#"{"message":"Must have admin rights to Repository."}"#,
        )
        .header("X-Accepted-OAuth-Scopes", "admin:org")
        .header("X-OAuth-Scopes", "gist, repo")
    });
    let error = native
        .api("GET", "/orgs/example/actions/runners?per_page=100", None)
        .unwrap_err()
        .to_string();
    assert!(error.contains("admin:org scope"));
    assert!(error.contains("gh auth refresh -h github.com -s admin:org"));
}

#[test]
fn step_fallback_isolates_and_removes_the_cli_archive_cache() {
    let (root, native) = fixture("printf '%s' \"$XDG_CACHE_HOME\" > cache-path\nprintf '%s' \"$*\" > arguments\nprintf 'archive' > \"$XDG_CACHE_HOME/private-log\"\nprintf 'Build\\tTests\\toutput\\n'");
    assert_eq!(
        native.step_log_fallback("example/build", 70, 2).unwrap(),
        "Build\tTests\toutput\n"
    );
    let cache = fs::read_to_string(root.path().join("cache-path")).unwrap();
    assert!(!Path::new(&cache).exists());
    let args = fs::read_to_string(root.path().join("arguments")).unwrap();
    assert!(args.contains("--attempt 2"));
}

#[test]
fn connection_reports_classic_oauth_scopes() {
    let (_root, native) = api_fixture("exit 1", |_| {
        Reply::json(json!({"login":"octo"})).header("X-OAuth-Scopes", "admin:org, gist, repo")
    });
    let (user, scopes) = native.user_with_scopes().unwrap();
    assert_eq!(user["login"], "octo");
    assert_eq!(scopes.unwrap(), ["admin:org", "gist", "repo"]);
}

#[test]
fn fine_grained_tokens_report_no_scope_list() {
    let (_root, native) = api_fixture("exit 1", |_| Reply::json(json!({"login":"octo"})));
    assert!(native.user_with_scopes().unwrap().1.is_none());
}

#[test]
fn rejected_cached_token_is_reread_once_before_reporting_sign_in() {
    let (root, native) = api_fixture("exit 1", |_| Reply::status(401, "{}"));
    let error = native
        .api("GET", "/user/orgs", None)
        .unwrap_err()
        .to_string();
    assert!(error.contains("mactions auth login"));
    let reads = fs::read_to_string(root.path().join("token-reads")).unwrap();
    assert_eq!(reads.lines().count(), 2);
}

#[test]
fn missing_cli_sign_in_is_reported_without_a_request() {
    let (_root, native) = fixture("exit 1");
    fs::write(
        &native.gh,
        "#!/bin/sh\necho 'no oauth token found' >&2\nexit 1\n",
    )
    .unwrap();
    let error = native
        .api("GET", "/user/orgs", None)
        .unwrap_err()
        .to_string();
    assert!(error.contains("mactions auth login"));
}
