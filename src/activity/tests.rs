use super::{read::ACTIVE_STATUSES, scope::resolve, *};
use crate::core::Backend;
use crate::core::{Manager, Runner, Target};
use anyhow::{Context, Result};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

#[derive(Default)]
struct Fake {
    replies: Mutex<HashMap<String, Value>>,
    requests: Mutex<Vec<String>>,
}
impl Fake {
    fn reply(&self, path: &str, data: Value) {
        self.replies.lock().unwrap().insert(path.into(), data);
    }
}
impl Backend for Fake {
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        assert_eq!(method, "GET");
        assert!(body.is_none());
        self.requests.lock().unwrap().push(endpoint.into());
        self.replies
            .lock()
            .unwrap()
            .get(endpoint)
            .cloned()
            .with_context(|| format!("No fixture for {endpoint}"))
    }
    fn prepare(&self, _: &Runner) -> Result<String> {
        unreachable!()
    }
    fn configure(&self, _: &Runner) -> Result<u64> {
        unreachable!()
    }
    fn recover_registration(&self, _: &Runner) -> Result<Option<u64>> {
        unreachable!()
    }
    fn install_service(&self, _: &Runner) -> Result<()> {
        unreachable!()
    }
    fn start(&self, _: &Runner) -> Result<()> {
        unreachable!()
    }
    fn stop(&self, _: &Runner) -> Result<()> {
        unreachable!()
    }
    fn remove_service(&self, _: &Runner) -> Result<()> {
        unreachable!()
    }
    fn local_status(&self, _: &Runner) -> Result<String> {
        Ok("running".into())
    }
}
fn fixture() -> (tempfile::TempDir, Manager, Arc<Fake>) {
    let dir = tempfile::tempdir().unwrap();
    let fake = Arc::new(Fake::default());
    let manager = Manager::new(dir.path().join("data"), fake.clone()).unwrap();
    (dir, manager, fake)
}
fn local(manager: &Manager, id: u64, github_id: u64, kind: &str, name: &str) {
    manager
        .save(&Runner {
            id,
            name: "same-name".into(),
            target: Target::new(kind, name).unwrap(),
            labels: vec![],
            path: manager.root.join(format!("actions-runner-{id}")),
            version: None,
            github_id: Some(github_id),
            enabled: true,
            phase: "ready".into(),
            error: None,
            deregistered: false,
            registration_attempted: true,
        })
        .unwrap();
}
fn raw_run(id: u64) -> Value {
    json!({"id":id,"workflow_id":9,"name":"CI","display_title":"Build changes","run_number":id,
            "run_attempt":2,"status":"completed","created_at":"2026-10-02T10:00:00Z","head_branch":"main"})
}
fn raw_job(id: u64, runner: u64, name: &str, attempt: u64) -> Value {
    json!({"id":id,"run_id":8,"run_attempt":attempt,"name":name,"runner_id":runner,
            "runner_name":"same-name","status":"completed","labels":[],
            "steps":[{"number":1,"name":"Build","status":"completed","started_at":"2026-10-02T10:00:00Z","completed_at":"2026-10-02T10:01:00Z"}]})
}

#[test]
fn scopes_validate_owner_and_do_not_expand_personal_repository_registrations() {
    assert!(Scope::new(Some("example"), Some("other/repo")).is_err());
    assert!(Scope::new(None, Some("owner/repo?private=1")).is_err());
    let scope = Scope::new(Some("Example"), Some("https://github.com/example/repo/")).unwrap();
    assert_eq!(scope.repository.as_deref(), Some("example/repo"));
    let (_dir, manager, fake) = fixture();
    local(&manager, 1, 42, "repo", "example/repo");
    let resolved = resolve(&manager, &Scope::new(None, None).unwrap()).unwrap();
    assert_eq!(resolved.repositories, vec!["example/repo"]);
    assert!(resolved.messages[0].contains("managed runners"));
    assert!(fake.requests.lock().unwrap().is_empty());
}

#[test]
fn organization_repository_discovery_follows_pages_and_deduplicates_scopes() {
    let (_dir, manager, fake) = fixture();
    fake.reply(
        "/orgs/example/repos?per_page=100&type=all&sort=updated&page=1",
        json!(vec![json!({"full_name":"example/first"}); 100]),
    );
    fake.reply(
        "/orgs/example/repos?per_page=100&type=all&sort=updated&page=2",
        json!([{"full_name":"example/second"}]),
    );
    let resolved = resolve(&manager, &Scope::new(Some("example"), None).unwrap()).unwrap();
    assert_eq!(
        resolved.repositories,
        vec!["example/first", "example/second"]
    );
    assert_eq!(resolved.targets.len(), 3);
    assert_eq!(fake.requests.lock().unwrap().len(), 2);
}

#[test]
fn runner_inventory_uses_github_identity_and_repository_availability() {
    let (_dir, manager, fake) = fixture();
    local(&manager, 1, 42, "org", "example");
    local(&manager, 2, 77, "repo", "example/another");
    local(&manager, 3, 99, "org", "example"); // Shared but unavailable to this repository.
    fake.reply("/repos/example/repo/actions/runners?per_page=100&page=1",json!({"runners":[
            {"id":42,"name":"same-name","status":"online","busy":true,"labels":[{"name":"self-hosted"}]},
            {"id":77,"name":"same-name","status":"online","busy":false,"labels":[]}]}));
    let data = runners(
        &manager,
        &Scope::new(None, Some("example/repo")).unwrap(),
        1,
    )
    .unwrap();
    let rows = data["runners"].as_array().unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0]["local_id"], 1);
    assert_eq!(rows[0]["labels"], json!(["self-hosted"]));
    assert_eq!(rows[1]["local_id"], Value::Null);
    assert_eq!(rows[1]["device"], "other_device");
    assert_eq!(rows[1]["host_type"], "self-hosted");
}

#[test]
fn runner_admin_failure_preserves_local_controls_and_independent_run_reads() {
    let (_dir, manager, fake) = fixture();
    local(&manager, 1, 42, "repo", "example/repo");
    let scope = Scope::new(None, Some("example/repo")).unwrap();
    let data = runners(&manager, &scope, 1).unwrap();
    assert_eq!(data["runners"][0]["local_id"], 1);
    assert!(data["message"].as_str().unwrap().contains("inventory"));
    fake.reply(
        "/repos/example/repo/actions/runs?per_page=20&page=1",
        json!({"total_count":1,"workflow_runs":[raw_run(8)]}),
    );
    let result = runs(&manager, &scope, 1, None).unwrap();
    assert_eq!(result["runs"].as_array().unwrap().len(), 1);
    assert!(result["runs"][0].get("jobs").is_none());
    assert!(!fake
        .requests
        .lock()
        .unwrap()
        .iter()
        .any(|path| path.contains("/jobs")));
}

#[test]
fn run_details_paginate_all_jobs_without_steps_and_do_not_guess_host_kind() {
    let (_dir, manager, fake) = fixture();
    local(&manager, 1, 42, "repo", "example/repo");
    fake.reply("/repos/example/repo/actions/runs/8", raw_run(8));
    let mut first: Vec<Value> = (1..=100).map(|id| raw_job(id, 77, "Build", 2)).collect();
    first[0]["runner_id"] = json!(42);
    first[1]["runner_id"] = json!(0);
    first[2]["labels"] = json!(["self-hosted"]);
    fake.reply(
        "/repos/example/repo/actions/runs/8/jobs?per_page=100&page=1&filter=latest",
        json!({"total_count":101,"jobs":first}),
    );
    fake.reply(
        "/repos/example/repo/actions/runs/8/jobs?per_page=100&page=2&filter=latest",
        json!({"total_count":101,"jobs":[raw_job(101,77,"Build",2)]}),
    );
    let data = run(&manager, "example/repo", 8, None).unwrap();
    let jobs = data["jobs"].as_array().unwrap();
    assert_eq!(jobs.len(), 101);
    assert!(jobs.iter().all(|job| job.get("steps").is_none()));
    assert_eq!(jobs[0]["device"], "this_device");
    assert_eq!(jobs[1]["device"], "unknown");
    assert_eq!(jobs[2]["host_type"], "self-hosted");
    assert_eq!(jobs[3]["host_type"], "unknown");
    assert_eq!(jobs[3]["device"], "other_device");
}

#[test]
fn selected_job_loads_steps_and_metadata_from_its_original_attempt() {
    let (_dir, manager, fake) = fixture();
    fake.reply(
        "/repos/example/repo/actions/jobs/70",
        raw_job(70, 77, "Build", 1),
    );
    let mut original = raw_run(8);
    original["run_attempt"] = json!(1);
    fake.reply("/repos/example/repo/actions/runs/8/attempts/1", original);
    let data = job(&manager, "example/repo", 70).unwrap();
    assert_eq!(data["run_attempt"], 1);
    assert_eq!(data["workflow_id"], 9);
    assert_eq!(data["steps"][0]["name"], "Build");
    assert_eq!(data["device"], "other_device");
}

#[test]
fn job_history_keeps_exact_matrix_names_and_every_attempt_without_eager_steps() {
    let (_dir, manager, fake) = fixture();
    fake.reply(
        "/repos/example/repo/actions/workflows/9/runs?per_page=20&page=1",
        json!({"total_count":21,"workflow_runs":[raw_run(8),raw_run(9)]}),
    );
    let mut first: Vec<Value> = (1..=100)
        .map(|id| raw_job(id, 77, "Build (linux)", 1))
        .collect();
    first[0] = raw_job(1, 77, "Build (macOS)", 1);
    first[1] = raw_job(2, 77, "Build (macOS)", 2);
    fake.reply(
        "/repos/example/repo/actions/runs/8/jobs?per_page=100&page=1&filter=all",
        json!({"total_count":101,"jobs":first}),
    );
    fake.reply(
        "/repos/example/repo/actions/runs/8/jobs?per_page=100&page=2&filter=all",
        json!({"total_count":101,"jobs":[raw_job(101,77,"Build (macOS)",3)]}),
    );
    let data = job_history(&manager, "example/repo", 9, "Build (macOS)", 1).unwrap();
    let jobs = data["jobs"].as_array().unwrap();
    assert_eq!(jobs.len(), 3);
    assert_eq!(
        jobs.iter()
            .map(|job| job["run_attempt"].as_u64().unwrap())
            .collect::<Vec<_>>(),
        vec![1, 2, 3]
    );
    assert!(jobs.iter().all(|job| job.get("steps").is_none()));
    assert_eq!(data["next_page"], 2);
    assert!(data["message"]
        .as_str()
        .unwrap()
        .contains("Jobs for run 9 are unavailable"));
    assert!(job_history(&manager, "example/repo", 9, "", 1).is_err());
}

#[test]
fn current_work_deduplicates_runs_and_leaves_unassigned_jobs_without_a_device() {
    let (_dir, manager, fake) = fixture();
    local(&manager, 1, 42, "repo", "example/repo");
    let mut active = raw_run(8);
    active["status"] = json!("in_progress");
    for status in ["in_progress", "queued"] {
        fake.reply(
            &format!("/repos/example/repo/actions/runs?per_page=20&status={status}&page=1"),
            json!({"workflow_runs":[active.clone()]}),
        );
    }
    let mut queued = raw_job(70, 0, "Test", 2);
    queued["status"] = json!("queued");
    fake.reply(
        "/repos/example/repo/actions/runs/8/jobs?per_page=100&page=1&filter=latest",
        json!({"total_count":2,"jobs":[raw_job(69,42,"Build",2),queued]}),
    );
    let data = work(&manager, &Scope::new(None, Some("example/repo")).unwrap()).unwrap();
    assert_eq!(data["runs"].as_array().unwrap().len(), 1);
    assert_eq!(data["runs"][0]["jobs"][0]["local_id"], 1);
    assert_eq!(data["runs"][0]["jobs"][1]["device"], "unknown");
    assert!(data["runs"][0]["jobs"][1].get("steps").is_none());
    assert!(!fake
        .requests
        .lock()
        .unwrap()
        .iter()
        .any(|path| path.contains("/logs")));
}

#[test]
fn runner_run_list_keeps_matching_attempts_and_reports_history_limits() {
    let (_dir, manager, fake) = fixture();
    let mut latest = raw_run(8);
    latest["run_attempt"] = json!(3);
    latest["conclusion"] = json!("failure");
    let mut original = raw_run(8);
    original["run_attempt"] = json!(1);
    original["conclusion"] = json!("success");
    fake.reply(
        "/repos/example/repo/actions/runs?per_page=20&page=100",
        json!({"total_count":2001,"workflow_runs":[latest,raw_run(9)]}),
    );
    fake.reply(
            "/repos/example/repo/actions/runs/8/jobs?per_page=100&page=1&filter=all",
            json!({"total_count":3,"jobs":[raw_job(70,42,"Build",1),raw_job(71,77,"Build",2),raw_job(73,42,"Build",3)]}),
        );
    fake.reply(
        "/repos/example/repo/actions/runs/9/jobs?per_page=100&page=1&filter=all",
        json!({"total_count":1,"jobs":[raw_job(72,77,"Test",2)]}),
    );
    fake.reply("/repos/example/repo/actions/runs/8/attempts/1", original);
    let data = runs(
        &manager,
        &Scope::new(None, Some("example/repo")).unwrap(),
        100,
        Some(42),
    )
    .unwrap();
    assert_eq!(data["runs"].as_array().unwrap().len(), 2);
    assert_eq!(data["runs"][0]["attempt"], 3);
    assert_eq!(data["runs"][1]["attempt"], 1);
    assert_eq!(data["runs"][1]["conclusion"], "success");
    let jobs = data["runs"][1]["jobs"].as_array().unwrap();
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0]["id"], 70);
    assert!(jobs[0].get("steps").is_none());
    assert!(data["next_page"].is_null());
    assert!(data["message"]
        .as_str()
        .unwrap()
        .contains("2,000-run history limit"));
    let success = runs_filtered(
        &manager,
        &Scope::new(None, Some("example/repo")).unwrap(),
        100,
        Some(42),
        Some("success"),
    )
    .unwrap();
    assert_eq!(success["runs"].as_array().unwrap().len(), 1);
    assert_eq!(success["runs"][0]["attempt"], 1);
    assert_eq!(success["runs"][0]["conclusion"], "success");
}

#[test]
fn active_status_search_finds_old_running_runs_and_keeps_successful_partial_results() {
    let (_dir, manager, fake) = fixture();
    for status in ACTIVE_STATUSES {
        if *status == "pending" {
            continue;
        } // One unavailable status must not hide the others.
        let mut run = raw_run(if *status == "in_progress" { 8 } else { 9 });
        run["status"] = json!(status);
        if *status == "in_progress" {
            run["created_at"] = json!("2025-01-01T10:00:00Z");
        }
        fake.reply(
            &format!("/repos/example/repo/actions/runs?per_page=20&page=1&status={status}"),
            json!({"total_count":if *status == "queued" {21} else {1},"workflow_runs":[run]}),
        );
    }
    let data = runs_filtered(
        &manager,
        &Scope::new(None, Some("example/repo")).unwrap(),
        1,
        None,
        Some("active"),
    )
    .unwrap();
    let rows = data["runs"].as_array().unwrap();
    assert_eq!(rows.len(), 2); // Duplicate IDs across transitions are merged.
    assert!(rows
        .iter()
        .any(|run| run["id"] == 8 && run["status"] == "in_progress"));
    assert_eq!(data["next_page"], 2);
    assert!(data["message"]
        .as_str()
        .unwrap()
        .contains("pending runs for example/repo are unavailable"));
    assert!(fake
        .requests
        .lock()
        .unwrap()
        .iter()
        .all(|path| path.contains("&status=")));
}

#[test]
fn global_conclusion_filter_is_applied_before_history_pagination() {
    let (_dir, manager, fake) = fixture();
    let mut success = raw_run(8);
    success["conclusion"] = json!("success");
    fake.reply(
        "/repos/example/repo/actions/runs?per_page=20&page=1&status=success",
        json!({"total_count":1,"workflow_runs":[success]}),
    );
    let scope = Scope::new(None, Some("example/repo")).unwrap();
    let data = runs_filtered(&manager, &scope, 1, None, Some("success")).unwrap();
    assert_eq!(data["runs"][0]["id"], 8);
    assert!(runs_filtered(&manager, &scope, 1, None, Some("unknown-status")).is_err());
    let mut last = raw_run(8);
    last["conclusion"] = json!("success");
    fake.reply(
        "/repos/example/repo/actions/runs?per_page=20&page=50&status=success",
        json!({"total_count":2000,"workflow_runs":[last]}),
    );
    let limited = runs_filtered(&manager, &scope, 50, None, Some("success")).unwrap();
    assert!(limited["next_page"].is_null());
    assert!(limited["message"]
        .as_str()
        .unwrap()
        .contains("1,000-run search limit"));
    assert!(runs_filtered(&manager, &scope, 51, None, Some("success")).is_err());
}

#[test]
fn broad_scopes_and_history_scans_slow_refresh_to_match_read_cost() {
    let (_dir, manager, fake) = fixture();
    let repos: Vec<Value> = (0..50)
        .map(|id| json!({"full_name":format!("example/repo{id}")}))
        .collect();
    fake.reply(
        "/orgs/example/repos?per_page=100&type=all&sort=updated&page=1",
        json!(repos),
    );
    fake.reply(
        "/orgs/example/actions/runners?per_page=100&page=1",
        json!({"runners":[]}),
    );
    for id in 0..50 {
        fake.reply(
            &format!("/repos/example/repo{id}/actions/runners?per_page=100&page=1"),
            json!({"runners":[]}),
        );
        fake.reply(
            &format!("/repos/example/repo{id}/actions/runs?per_page=20&page=1"),
            json!({"workflow_runs":[],"total_count":0}),
        );
        for status in ["in_progress", "queued"] {
            fake.reply(
                &format!("/repos/example/repo{id}/actions/runs?per_page=20&status={status}&page=1"),
                json!({"workflow_runs":[]}),
            );
        }
    }
    let org = Scope::new(Some("example"), None).unwrap();
    assert_eq!(
        runners(&manager, &org, 1).unwrap()["refresh_after_seconds"],
        104
    );
    assert_eq!(work(&manager, &org).unwrap()["refresh_after_seconds"], 202);
    assert_eq!(
        runs(&manager, &org, 1, None).unwrap()["refresh_after_seconds"],
        102
    );

    let history: Vec<Value> = (1..=20).map(raw_run).collect();
    fake.reply(
        "/repos/example/repo0/actions/runs?per_page=20&page=1",
        json!({"workflow_runs":history.clone(),"total_count":20}),
    );
    fake.reply(
        "/repos/example/repo0/actions/workflows/9/runs?per_page=20&page=1",
        json!({"workflow_runs":history,"total_count":20}),
    );
    for id in 1..=20 {
        fake.reply(
            &format!("/repos/example/repo0/actions/runs/{id}/jobs?per_page=100&page=1&filter=all"),
            json!({"total_count":1,"jobs":[raw_job(id,42,"Build",2)]}),
        );
    }
    let repo = Scope::new(None, Some("example/repo0")).unwrap();
    assert_eq!(
        runs(&manager, &repo, 1, Some(42)).unwrap()["refresh_after_seconds"],
        42
    );
    assert_eq!(
        job_history(&manager, "example/repo0", 9, "Build", 1).unwrap()["refresh_after_seconds"],
        42
    );
}
