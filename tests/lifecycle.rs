use anyhow::{bail, Result};
use mactions::core::{Backend, Create, Manager, Runner, Target};
use serde_json::{json, Value};
use std::{
    fs,
    sync::{Arc, Barrier, Mutex},
    thread,
};
use tempfile::TempDir;

#[derive(Default)]
struct Fake {
    events: Mutex<Vec<String>>,
    failure: Mutex<Option<String>>,
    remote: Mutex<Vec<Value>>,
    running: Mutex<bool>,
    gate: Mutex<Option<Arc<Barrier>>>,
}
impl Fake {
    fn event(&self, event: &str) -> Result<()> {
        self.events.lock().unwrap().push(event.into());
        if self.failure.lock().unwrap().as_deref() == Some(event) {
            bail!("Injected failure: {event}");
        }
        Ok(())
    }
    fn fail(&self, event: &str) {
        *self.failure.lock().unwrap() = Some(event.into());
    }
    fn clear(&self) {
        self.events.lock().unwrap().clear();
        *self.failure.lock().unwrap() = None;
    }
}
impl Backend for Fake {
    fn registration_token(&self, _: &Target) -> Result<Option<String>> {
        if self.failure.lock().unwrap().as_deref() == Some("registration-token") {
            bail!("Registration permission denied");
        }
        Ok(None)
    }
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        if method == "GET" {
            self.event("list")?;
            return Ok(json!({"runners":self.remote.lock().unwrap().clone()}));
        }
        if method == "DELETE" {
            self.event("deregister")?;
            self.remote.lock().unwrap().clear();
            return Ok(Value::Null);
        }
        assert!(endpoint.ends_with("/labels"));
        self.event("labels")?;
        Ok(body.unwrap())
    }
    fn prepare(&self, _: &Runner) -> Result<String> {
        self.event("prepare")?;
        let gate = self.gate.lock().unwrap().clone();
        if let Some(gate) = gate {
            gate.wait();
            gate.wait();
        }
        Ok("2.999.0".into())
    }
    fn configure(&self, r: &Runner) -> Result<u64> {
        self.event("configure")?;
        fs::write(r.path.join("identity"), "42")?;
        self.remote.lock().unwrap().push(json!({"id":42,"name":r.name,"status":"online","busy":true,"labels":[{"name":"self-hosted","type":"read-only"}]}));
        Ok(42)
    }
    fn configure_with_token(&self, r: &Runner, token: &str) -> Result<u64> {
        assert_eq!(token, "fixture-registration-token");
        self.configure(r)
    }
    fn recover_registration(&self, r: &Runner) -> Result<Option<u64>> {
        Ok(fs::read_to_string(r.path.join("identity"))
            .ok()
            .and_then(|s| s.parse().ok()))
    }
    fn install_service(&self, _: &Runner) -> Result<()> {
        self.event("install")
    }
    fn start(&self, _: &Runner) -> Result<()> {
        self.event("start")?;
        *self.running.lock().unwrap() = true;
        Ok(())
    }
    fn stop(&self, _: &Runner) -> Result<()> {
        self.event("stop")?;
        *self.running.lock().unwrap() = false;
        Ok(())
    }
    fn remove_service(&self, _: &Runner) -> Result<()> {
        self.event("remove_service")
    }
    fn local_status(&self, _: &Runner) -> Result<String> {
        Ok(if *self.running.lock().unwrap() {
            "running"
        } else {
            "stopped"
        }
        .into())
    }
}
fn setup() -> (TempDir, Arc<Fake>, Manager) {
    let root = TempDir::new().unwrap();
    let fake = Arc::new(Fake::default());
    let manager = Manager::new(root.path().into(), fake.clone()).unwrap();
    (root, fake, manager)
}
fn request() -> Create {
    Create {
        kind: "repo".into(),
        target: "example/build".into(),
        prefix: "test-mac".into(),
        labels: vec!["build".into()],
        registration_token: None,
    }
}

#[test]
fn creation_starts_immediately_and_reuses_naming_convention() {
    let (_root, fake, manager) = setup();
    fs::create_dir(manager.root.join("actions-runner")).unwrap();
    fs::create_dir(manager.root.join("actions-runner-4")).unwrap();
    let r = manager.create(request()).unwrap();
    assert_eq!(r.id, 5);
    assert_eq!(r.name, "test-mac-5");
    assert!(r.enabled);
    assert_eq!(
        &*fake.events.lock().unwrap(),
        &["list", "prepare", "configure", "install", "start"]
    );
    assert_eq!(manager.records().unwrap().len(), 1);
}
#[test]
fn stop_preserves_files_and_desired_state_across_manager_restarts() {
    let (_root, fake, manager) = setup();
    let r = manager.create(request()).unwrap();
    fs::write(r.path.join("job-output"), "keep").unwrap();
    manager.action(r.id, "stop", &[]).unwrap();
    let reopened = Manager::new(manager.root.clone(), fake).unwrap();
    assert!(!reopened.get(r.id).unwrap().enabled);
    assert_eq!(reopened.get(r.id).unwrap().phase, "stopped");
    assert_eq!(
        fs::read_to_string(r.path.join("job-output")).unwrap(),
        "keep"
    );
}
#[test]
fn failed_stop_prevents_deregistration_and_all_deletion() {
    let (_root, fake, manager) = setup();
    let r = manager.create(request()).unwrap();
    fake.clear();
    fake.fail("stop");
    assert!(manager.action(r.id, "delete", &[]).is_err());
    assert_eq!(&*fake.events.lock().unwrap(), &["stop"]);
    assert!(r.path.exists());
    assert!(!fake.remote.lock().unwrap().is_empty());
    assert_eq!(manager.get(r.id).unwrap().phase, "failed");
}
#[test]
fn failed_remote_delete_preserves_files_and_retry_completes_in_order() {
    let (_root, fake, manager) = setup();
    let r = manager.create(request()).unwrap();
    fake.clear();
    fake.fail("deregister");
    assert!(manager.action(r.id, "delete", &[]).is_err());
    assert!(r.path.exists());
    assert!(!manager.get(r.id).unwrap().deregistered);
    fake.clear();
    manager.action(r.id, "delete", &[]).unwrap();
    assert_eq!(
        &*fake.events.lock().unwrap(),
        &["stop", "deregister", "remove_service"]
    );
    assert!(!r.path.exists());
    assert!(manager.records().unwrap().is_empty());
}
#[test]
fn cleanup_failure_retries_without_registering_or_deregistering_again() {
    let (_root, fake, manager) = setup();
    let r = manager.create(request()).unwrap();
    fake.clear();
    fake.fail("remove_service");
    assert!(manager.action(r.id, "delete", &[]).is_err());
    assert!(manager.get(r.id).unwrap().deregistered);
    assert!(r.path.exists());
    assert!(manager.action(r.id, "retry", &[]).is_err());
    fake.clear();
    manager.action(r.id, "delete", &[]).unwrap();
    assert_eq!(&*fake.events.lock().unwrap(), &["stop", "remove_service"]);
}
#[test]
fn retry_recovers_registration_after_configuration_without_duplicate() {
    let (_root, fake, manager) = setup();
    fake.fail("install");
    assert!(manager.create(request()).is_err());
    let mut r = manager.get(1).unwrap();
    r.github_id = None;
    r.phase = "registering".into();
    manager.save(&r).unwrap();
    fake.clear();
    manager.action(1, "retry", &[]).unwrap();
    assert_eq!(&*fake.events.lock().unwrap(), &["install", "start"]);
    assert_eq!(manager.get(1).unwrap().github_id, Some(42));
}
#[test]
fn failed_registration_with_no_remote_identity_can_be_deleted() {
    let (_root, fake, manager) = setup();
    fake.fail("configure");
    assert!(manager.create(request()).is_err());
    fake.clear();
    manager.action(1, "delete", &[]).unwrap();
    assert!(manager.records().unwrap().is_empty());
    assert!(!fake.events.lock().unwrap().contains(&"deregister".into()));
}
#[test]
fn ambiguous_registration_is_preserved_instead_of_deleting_a_name_match() {
    let (_root, fake, manager) = setup();
    fake.fail("configure");
    assert!(manager.create(request()).is_err());
    fake.remote
        .lock()
        .unwrap()
        .push(json!({"id":99,"name":"test-mac-1"}));
    fake.clear();
    assert!(manager
        .action(1, "delete", &[])
        .unwrap_err()
        .to_string()
        .contains("local identity is missing"));
    assert!(manager.get(1).unwrap().path.exists());
    assert!(!fake.events.lock().unwrap().contains(&"deregister".into()));
}
#[test]
fn collision_does_not_allocate_or_replace_a_runner() {
    let (_root, fake, manager) = setup();
    fake.remote
        .lock()
        .unwrap()
        .push(json!({"name":"test-mac-1","id":99}));
    assert!(manager
        .create(request())
        .unwrap_err()
        .to_string()
        .contains("already exists"));
    assert!(!manager.root.join("actions-runner-1").exists());
}
#[test]
fn labels_use_remote_api_and_cannot_edit_default_labels() {
    let (_root, fake, manager) = setup();
    let r = manager.create(request()).unwrap();
    fake.clear();
    assert!(manager
        .action(r.id, "labels", &["self-hosted".into()])
        .is_err());
    assert!(fake.events.lock().unwrap().is_empty());
    manager.action(r.id, "labels", &[]).unwrap();
    assert!(manager.get(r.id).unwrap().labels.is_empty());
    assert_eq!(&*fake.events.lock().unwrap(), &["labels"]);
}
#[test]
fn remote_status_is_authoritative_and_network_failure_is_unknown() {
    let (_root, fake, manager) = setup();
    manager.create(request()).unwrap();
    let list = manager.list(true).unwrap();
    assert_eq!(list["runners"][0]["busy"], true);
    fake.fail("list");
    let list = manager.list(true).unwrap();
    assert_eq!(list["runners"][0]["github_status"], "unknown");
    assert_eq!(list["runners"][0]["busy"], Value::Null);
    assert_eq!(list["runners"][0]["local_status"], "running");
}
#[test]
fn concurrent_managers_cannot_allocate_the_same_directory() {
    let (_root, fake, manager) = setup();
    let manager = Arc::new(manager);
    let gate = Arc::new(Barrier::new(2));
    *fake.gate.lock().unwrap() = Some(gate.clone());
    let worker_manager = manager.clone();
    let worker = thread::spawn(move || worker_manager.create(request()));
    gate.wait();
    let other = Manager::new(manager.root.clone(), fake.clone()).unwrap();
    assert!(other
        .create(request())
        .unwrap_err()
        .to_string()
        .contains("Another management operation"));
    assert_eq!(other.list(false).unwrap()["operation_running"], true);
    gate.wait();
    worker.join().unwrap().unwrap();
    assert_eq!(other.records().unwrap().len(), 1);
}
#[test]
fn symlink_runner_directory_is_not_deletable() {
    let (_root, fake, manager) = setup();
    let r = manager.create(request()).unwrap();
    let outside = TempDir::new().unwrap();
    fs::write(outside.path().join("keep"), "safe").unwrap();
    fs::remove_dir_all(&r.path).unwrap();
    std::os::unix::fs::symlink(outside.path(), &r.path).unwrap();
    fake.clear();
    assert!(manager.action(r.id, "delete", &[]).is_err());
    assert!(outside.path().join("keep").exists());
    assert!(fake.events.lock().unwrap().is_empty());
}
#[test]
fn validates_target_without_allowing_paths_or_other_hosts() {
    assert_eq!(
        Target::new("repo", "https://github.com/example/build/")
            .unwrap()
            .name,
        "example/build"
    );
    for invalid in [
        "../build",
        "example/repo/extra",
        "https://example.net/a/b",
        "example/a?x=1",
        "example/..",
    ] {
        assert!(Target::new("repo", invalid).is_err());
    }
}

#[test]
fn token_registration_and_local_controls_do_not_require_github_access() {
    let (_root, fake, manager) = setup();
    fake.fail("list");
    let mut input = request();
    input.registration_token = Some("fixture-registration-token".into());
    let runner = manager.create(input).unwrap();
    manager.action(runner.id, "stop", &[]).unwrap();
    manager.action(runner.id, "start", &[]).unwrap();
    manager.action(runner.id, "restart", &[]).unwrap();
    assert!(!fake.events.lock().unwrap().iter().any(|e| e == "list"));
    let record = fs::read_to_string(manager.root.join("records/1.json")).unwrap();
    assert!(!record.contains("fixture-registration-token"));
    assert!(manager.list(false).is_ok());
}

struct GithubFixture;
impl Backend for GithubFixture {
    fn api(&self, _: &str, endpoint: &str, _: Option<Value>) -> Result<Value> {
        if endpoint.contains("/actions/runs/9/jobs") {
            return Ok(json!({"total_count":3,"jobs":[
                {"id":1,"runner_id":42,"name":"Local build","status":"in_progress",
                    "runner_name":"mac-1","runner_group_name":"Default","labels":["self-hosted","macOS"],
                    "steps":[{"number":1,"name":"Checkout","status":"completed",
                        "started_at":"2026-09-30T00:00:00Z","completed_at":"2026-09-30T00:00:02Z"}]},
                {"id":2,"runner_id":99,"name":"Other machine","status":"completed","steps":[]},
                {"id":3,"runner_id":null,"name":"Not assigned","status":"queued","steps":[]}
            ]}));
        }
        if endpoint.contains("/actions/runs?") {
            return Ok(
                json!({"total_count":1,"workflow_runs":[{"id":9,"name":"CI","head_branch":"main","run_number":7,
                    "run_attempt":2,"actor":{"login":"builder"},"event":"push","head_sha":"abcdef",
                    "head_commit":{"message":"Improve builds"},"workflow_id":11,"path":".github/workflows/ci.yml"}]}),
            );
        }
        if endpoint == "/user" {
            return Ok(json!({"login":"fixture"}));
        }
        Ok(json!({"runners":[],"owner":{"type":"Organization"}}))
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
#[test]
fn github_jobs_only_include_this_runner_and_reads_do_not_prove_write_access() {
    let (_root, _, original) = setup();
    let r = original.create(request()).unwrap();
    let manager = Manager::new(original.root.clone(), Arc::new(GithubFixture)).unwrap();
    let jobs = mactions::github::jobs(&manager, r.id, None).unwrap();
    assert_eq!(jobs["jobs"].as_array().unwrap().len(), 1);
    assert_eq!(jobs["jobs"][0]["name"], "Local build");
    assert_eq!(jobs["jobs"][0]["run_id"], 9);
    assert_eq!(jobs["jobs"][0]["run_attempt"], 2);
    assert_eq!(jobs["jobs"][0]["actor"], "builder");
    assert_eq!(jobs["jobs"][0]["commit_message"], "Improve builds");
    assert_eq!(jobs["jobs"][0]["runner_name"], "mac-1");
    assert_eq!(
        jobs["jobs"][0]["workflow_url"],
        "https://github.com/example/build/actions/workflows/11"
    );
    assert_eq!(
        jobs["jobs"][0]["steps"][0]["completed_at"],
        "2026-09-30T00:00:02Z"
    );
    let access = mactions::github::capabilities(&manager, &r.target);
    assert_eq!(access["runner_status"]["state"], "available");
    assert_eq!(access["manage"]["state"], "unknown");
    let mut r = r;
    r.target = Target::new("org", "example").unwrap();
    manager.save(&r).unwrap();
    assert_eq!(
        mactions::github::jobs(&manager, r.id, None).unwrap()["needs_repository"],
        true
    );
    assert!(mactions::github::jobs(&manager, r.id, Some("unrelated/repo")).is_err());
}

#[test]
fn automatic_registration_denial_does_not_allocate_a_runner() {
    let (_root, fake, manager) = setup();
    fake.fail("registration-token");
    assert!(manager
        .create(request())
        .unwrap_err()
        .to_string()
        .contains("permission denied"));
    assert!(manager.records().unwrap().is_empty());
    assert!(!manager.root.join("actions-runner-1").exists());
}

#[test]
fn creation_rejects_whitespace_paths_before_remote_changes() {
    let root = TempDir::new().unwrap();
    let fake = Arc::new(Fake::default());
    let manager = Manager::new(root.path().join("Application Support"), fake.clone()).unwrap();
    let error = manager.create(request()).unwrap_err().to_string();
    assert!(error.contains("without whitespace"), "{error}");
    assert!(fake.events.lock().unwrap().is_empty());
    assert!(manager.records().unwrap().is_empty());
}
