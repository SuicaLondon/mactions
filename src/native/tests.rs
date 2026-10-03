use super::{commands::checked, Native};
use crate::core::{Backend, Runner};
use serde_json::json;
use std::os::unix::fs::PermissionsExt;
use std::{fs, path::Path, process::Command};
use tempfile::TempDir;

fn fixture(script: &str) -> (TempDir, Native) {
    let root = TempDir::new().unwrap();
    let gh = root.path().join("gh");
    fs::write(
        &gh,
        format!(
            "#!/bin/bash\nset -eu\ncd '{}'\n{script}\n",
            root.path().display()
        ),
    )
    .unwrap();
    fs::set_permissions(&gh, fs::Permissions::from_mode(0o755)).unwrap();
    let native = Native {
        root: root.path().into(),
        gh,
    };
    (root, native)
}
#[test]
fn all_pages_are_used_for_name_and_identity_lookup() {
    let (root, native) = fixture("printf '%s\\n' \"$*\" >> requests\ncase \"${!#}\" in *page=1) cat page1.json;; *) cat page2.json;; esac");
    fs::write(
        root.path().join("page1.json"),
        json!({"runners":(0..100).map(|id|json!({"id":id})).collect::<Vec<_>>()} ).to_string(),
    )
    .unwrap();
    fs::write(
        root.path().join("page2.json"),
        json!({"runners":[{"id":101,"name":"last-page"}]}).to_string(),
    )
    .unwrap();
    let result = native
        .api("GET", "/orgs/example/actions/runners?per_page=100", None)
        .unwrap();
    assert_eq!(result["runners"].as_array().unwrap().len(), 101);
    assert_eq!(result["runners"][100]["name"], "last-page");
}
#[test]
fn inaccessible_target_does_not_count_as_successful_deregistration() {
    let (_root, native) = fixture("echo 'HTTP 404: Not Found' >&2; exit 1");
    assert!(native
        .api("DELETE", "/repos/example/build/actions/runners/42", None)
        .unwrap_err()
        .to_string()
        .contains("permissions"));
}
#[test]
fn deletion_is_idempotent_only_after_an_authenticated_list() {
    let (root, native) = fixture("printf '%s\\n' \"$*\" >> requests\necho '{\"runners\":[]}'");
    native
        .api("DELETE", "/repos/example/build/actions/runners/42", None)
        .unwrap();
    let requests = fs::read_to_string(root.path().join("requests")).unwrap();
    assert!(requests.contains("--method GET"));
    assert!(!requests.contains("--method DELETE"));
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
    let (root, native) = fixture("echo '{\"token\":\"secret-fixture-token\"}'");
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
