use super::*;
use std::sync::Arc;

fn log_fixture() -> (tempfile::TempDir, Manager, Value) {
    use crate::{core::Runner, native::Native};
    use std::{fs, os::unix::fs::PermissionsExt};
    let dir = tempfile::tempdir().unwrap();
    let executable = dir.path().join("gh");
    fs::write(
        &executable,
        format!(
            r#"#!/bin/bash
set -eu
cd '{}'
printf '%s\n' "$*" >> requests
if [ "$1" = run ]; then cat fallback.log; exit; fi
case "${{!#}}" in
  */steps/*/logs) if [ -f step.log ]; then cat step.log; else echo 'HTTP 404' >&2; exit 1; fi;;
  */jobs/70/logs) cat job.log;;
  */jobs/70) cat job.json;;
  */attempts/2/jobs*) cat attempt.json;;
  *) exit 1;;
esac
"#,
            dir.path().display()
        ),
    )
    .unwrap();
    fs::set_permissions(&executable, fs::Permissions::from_mode(0o755)).unwrap();
    let manager = Manager::new(
        dir.path().join("data"),
        Arc::new(Native {
            root: dir.path().into(),
            gh: executable,
        }),
    )
    .unwrap();
    manager
        .save(&Runner {
            id: 1,
            name: "mac-1".into(),
            target: Target::new("repo", "example/build").unwrap(),
            labels: vec![],
            path: manager.root.join("actions-runner-1"),
            version: None,
            github_id: Some(42),
            enabled: true,
            phase: "running".into(),
            error: None,
            deregistered: false,
            registration_attempted: true,
        })
        .unwrap();
    let job = json!({"id":70,"runner_id":42,"run_id":8,"run_attempt":2,
    "name":"Build", "status":"completed", "steps":[
        {"number":1,"name":"Checkout","status":"completed"},
        {"number":5,"name":"Tests","status":"completed"}
    ]});
    fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    fs::write(
        dir.path().join("attempt.json"),
        json!({"total_count":1,"jobs":[job.clone()]}).to_string(),
    )
    .unwrap();
    fs::write(dir.path().join("job.log"), "complete job output\n").unwrap();
    fs::write(
        dir.path().join("fallback.log"),
        "Build\tCheckout\tcheckout\nBuild\tTests\ttests\n",
    )
    .unwrap();
    (dir, manager, job)
}

#[test]
fn job_logs_validate_repository_and_runner_before_download() {
    let (dir, manager, mut job) = log_fixture();
    assert!(job_logs(&manager, 1, Some("other/repo"), 70, None).is_err());
    assert!(!dir.path().join("requests").exists());
    job["runner_id"] = json!(99);
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    assert!(job_logs(&manager, 1, None, 70, None)
        .unwrap_err()
        .to_string()
        .contains("selected runner"));
    let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
    assert!(!requests.contains("/logs"));
    let mut runner = manager.get(1).unwrap();
    runner.target = Target::new("org", "example").unwrap();
    manager.save(&runner).unwrap();
    assert!(job_logs(&manager, 1, Some("unrelated/repo"), 70, None).is_err());
    assert!(job_logs(&manager, 1, None, 70, None).is_err());
}

#[test]
fn repository_logs_support_remote_jobs_without_a_local_registration() {
    let (dir, manager, mut job) = log_fixture();
    job["runner_id"] = json!(99);
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    std::fs::remove_file(manager.root.join("records/1.json")).unwrap();
    let result = repository_job_logs(&manager, "other/repository", 70, None).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["content"], "complete job output\n");
    let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
    assert!(requests.contains("repos/other/repository/actions/jobs/70/logs"));
    assert!(repository_job_logs(&manager, "other/repository/../../secret", 70, None).is_err());
    job["status"] = json!("in_progress");
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    assert_eq!(
        repository_job_logs(&manager, "other/repository", 70, None).unwrap()["state"],
        "pending"
    );
}

#[test]
fn step_logs_use_zero_based_position_even_with_duplicate_names_and_number_gaps() {
    let (dir, manager, mut job) = log_fixture();
    job["steps"][0]["name"] = json!("Tests");
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    std::fs::write(dir.path().join("step.log"), "second Tests output\n").unwrap();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["scope"], "step");
    assert_eq!(result["content"], "second Tests output\n");
    assert_eq!(result["steps"][0]["number"], 5);
    assert!(std::fs::read_to_string(dir.path().join("requests"))
        .unwrap()
        .contains("/steps/1/logs"));
    assert!(job_logs(&manager, 1, None, 70, Some(2)).is_err());
}

#[test]
fn unavailable_step_endpoint_falls_back_to_verified_attempt_and_exact_name() {
    let (dir, manager, _) = log_fixture();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["scope"], "step");
    assert_eq!(result["content"], "tests\n");
    let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
    assert!(requests.contains("/attempts/2/jobs"));
    assert!(requests.contains("--job 70 --attempt 2 --log"));
    let full = job_logs(&manager, 1, None, 70, None).unwrap();
    assert_eq!(full["content"], "complete job output\n");
}

#[test]
fn unknown_step_mapping_returns_complete_job_without_associating_it_to_a_step() {
    let (dir, manager, _) = log_fixture();
    std::fs::write(
        dir.path().join("fallback.log"),
        "Build\tUNKNOWN STEP\tcheckout\nBuild\tUNKNOWN STEP\ttests\n",
    )
    .unwrap();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["scope"], "job");
    assert_eq!(result["content"], "complete job output\n");
    assert_eq!(result["steps"], json!([]));
    assert_eq!(
        result["message"],
        "GitHub did not publish a separate log for this step. Showing the complete job log."
    );
    let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
    assert!(requests.contains("/steps/1/logs"));
    assert!(requests.contains("/attempts/2/jobs"));
    assert!(requests.contains("/jobs/70/logs"));
}

#[test]
fn ambiguous_step_names_and_job_archives_use_complete_job_scope() {
    let (dir, manager, mut job) = log_fixture();
    job["steps"][0]["name"] = json!("Tests");
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["scope"], "job");
    assert_eq!(result["content"], "complete job output\n");
    assert_eq!(result["steps"], json!([]));
    job["steps"][0]["name"] = json!("Checkout");
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    std::fs::write(
        dir.path().join("attempt.json"),
        json!({"total_count":2,
            "jobs":[job,{"id":71,"name":"Bui/ld:"}]})
        .to_string(),
    )
    .unwrap();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["scope"], "job");
    assert_eq!(result["steps"], json!([]));
    assert!(!std::fs::read_to_string(dir.path().join("requests"))
        .unwrap()
        .contains("run view"));
}

#[test]
fn unverified_attempt_archive_cannot_supply_selected_step_output() {
    let (dir, manager, mut job) = log_fixture();
    job["id"] = json!(71);
    std::fs::write(
        dir.path().join("attempt.json"),
        json!({"total_count":1,"jobs":[job]}).to_string(),
    )
    .unwrap();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "available");
    assert_eq!(result["scope"], "job");
    assert_eq!(result["content"], "complete job output\n");
    let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
    assert!(requests.contains("/attempts/2/jobs"));
    assert!(!requests.contains("run view"));
    assert!(requests.contains("/jobs/70/logs"));
}

#[test]
fn step_authentication_and_access_errors_are_not_replaced_with_complete_job_output() {
    for (status, expected_message) in [("401", "authentication"), ("403", "denied log access")] {
        let (dir, manager, _) = log_fixture();
        let executable = dir.path().join("gh");
        let script = std::fs::read_to_string(&executable)
            .unwrap()
            .replace("HTTP 404", &format!("HTTP {status}"));
        std::fs::write(executable, script).unwrap();
        let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
        assert_eq!(result["state"], "unavailable");
        assert!(result["message"]
            .as_str()
            .unwrap()
            .contains(expected_message));
        let requests = std::fs::read_to_string(dir.path().join("requests")).unwrap();
        assert!(!requests.contains("run view"));
        assert!(!requests.contains("/jobs/70/logs"));
    }
}

#[test]
fn unfinished_logs_are_pending_without_claiming_a_complete_download() {
    let (dir, manager, mut job) = log_fixture();
    job["status"] = json!("in_progress");
    job["steps"][1]["status"] = json!("in_progress");
    std::fs::write(dir.path().join("job.json"), job.to_string()).unwrap();
    assert_eq!(
        job_logs(&manager, 1, None, 70, Some(5)).unwrap()["state"],
        "pending"
    );
    assert_eq!(
        job_logs(&manager, 1, None, 70, None).unwrap()["state"],
        "pending"
    );
    assert!(!std::fs::read_to_string(dir.path().join("requests"))
        .unwrap()
        .contains("/logs"));
    // Completed steps may be available before the rest of a workflow finishes.
    std::fs::write(dir.path().join("step.log"), "checkout done\n").unwrap();
    assert_eq!(
        job_logs(&manager, 1, None, 70, Some(1)).unwrap()["state"],
        "available"
    );
}

#[test]
fn completed_job_waits_for_step_archive_while_other_workflow_jobs_are_running() {
    let (dir, manager, _) = log_fixture();
    let executable = dir.path().join("gh");
    let script = std::fs::read_to_string(&executable).unwrap().replace(
        "if [ \"$1\" = run ]; then cat fallback.log; exit; fi",
        "if [ \"$1\" = run ]; then echo 'run 8 is still in progress' >&2; exit 1; fi",
    );
    std::fs::write(executable, script).unwrap();
    let result = job_logs(&manager, 1, None, 70, Some(5)).unwrap();
    assert_eq!(result["state"], "pending");
    assert!(result["message"]
        .as_str()
        .unwrap()
        .contains("workflow is still running"));
    assert_eq!(
        job_logs(&manager, 1, None, 70, None).unwrap()["state"],
        "available"
    );
}

#[test]
fn step_fallback_keeps_tabs_and_newlines_but_rejects_unknown_or_malformed_rows() {
    assert_eq!(
        extract_step_log(
            "Build\tTests\tfirst\tvalue\nBuild\tCheckout\tskip\nBuild\tTests\tlast",
            "Build",
            "Tests"
        )
        .unwrap(),
        "first\tvalue\nlast"
    );
    assert!(extract_step_log("Build\tUNKNOWN STEP\tvalue\n", "Build", "Tests").is_err());
    assert!(extract_step_log("Other\tTests\tvalue\n", "Build", "Tests").is_err());
    assert!(extract_step_log("missing separators\n", "Build", "Tests").is_err());
}
