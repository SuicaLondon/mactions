use super::*;
use crate::core::{Backend, Runner};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

#[derive(Default)]
struct RunsFixture {
    replies: HashMap<String, Value>,
    requests: Mutex<Vec<String>>,
}

impl Backend for RunsFixture {
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        assert_eq!(method, "GET");
        assert!(body.is_none());
        self.requests.lock().unwrap().push(endpoint.into());
        self.replies
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
        unreachable!()
    }
}

fn fixture(replies: HashMap<String, Value>) -> (tempfile::TempDir, Manager, Arc<RunsFixture>) {
    let dir = tempfile::tempdir().unwrap();
    let backend = Arc::new(RunsFixture {
        replies,
        ..Default::default()
    });
    let manager = Manager::new(dir.path().join("data"), backend.clone()).unwrap();
    manager
        .save(&Runner {
            id: 1,
            name: "mac".into(),
            target: Target::new("repo", "example/repo").unwrap(),
            labels: vec![],
            path: manager.root.join("actions-runner-1"),
            version: None,
            github_id: Some(42),
            enabled: true,
            phase: "ready".into(),
            error: None,
            deregistered: false,
            registration_attempted: true,
        })
        .unwrap();
    (dir, manager, backend)
}

fn jobs_page(jobs: &[(u64, u64)]) -> Value {
    json!({"total_count":jobs.len(),"jobs":jobs.iter().map(|(id, runner)| json!({"id":id,"runner_id":runner})).collect::<Vec<_>>()})
}

#[test]
fn runner_jobs_read_each_run_once_and_keep_active_runs_first() {
    let runs = "/repos/example/repo/actions/runs?per_page=10";
    let jobs = |run: u64| {
        format!("/repos/example/repo/actions/runs/{run}/jobs?per_page=100&filter=latest")
    };
    let (_dir, manager, backend) = fixture(HashMap::from([
        (
            format!("{runs}&status=in_progress"),
            json!({"total_count":1,"workflow_runs":[{"id":7}]}),
        ),
        (
            runs.to_string(),
            json!({"total_count":2,"workflow_runs":[{"id":8},{"id":7}]}),
        ),
        (jobs(7), jobs_page(&[(70, 42), (71, 5)])),
        (jobs(8), jobs_page(&[(80, 42)])),
    ]));
    let result = super::jobs(&manager, 1, None).unwrap();
    let ids: Vec<_> = result["jobs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|job| job["id"].as_u64().unwrap())
        .collect();
    assert_eq!(ids, [70, 80]);
    assert_eq!(result["limited"], false);
    let mut requests = backend.requests.lock().unwrap().clone();
    requests.sort();
    let mut expected = vec![
        runs.to_string(),
        format!("{runs}&status=in_progress"),
        jobs(7),
        jobs(8),
    ];
    expected.sort();
    assert_eq!(requests, expected);
}

#[test]
fn runner_jobs_fail_when_any_run_cannot_be_read() {
    let runs = "/repos/example/repo/actions/runs?per_page=10";
    let (_dir, manager, _backend) = fixture(HashMap::from([
        (
            format!("{runs}&status=in_progress"),
            json!({"total_count":0,"workflow_runs":[]}),
        ),
        (
            runs.to_string(),
            json!({"total_count":1,"workflow_runs":[{"id":9}]}),
        ),
    ]));
    assert!(super::jobs(&manager, 1, None).is_err());
}
