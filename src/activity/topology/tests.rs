use super::*;
use crate::core::{Backend, Runner};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::json;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

const SHA: &str = "1111111111111111111111111111111111111111";
const FILE_PATH: &str = ".github/workflows/ci.yml";

#[derive(Default)]
struct Fake {
    replies: Mutex<HashMap<String, Value>>,
    requests: Mutex<Vec<String>>,
}
impl Fake {
    fn reply(&self, path: &str, value: Value) {
        self.replies.lock().unwrap().insert(path.into(), value);
    }
}
impl Backend for Fake {
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        if endpoint == "/graphql" {
            assert_eq!(method, "POST");
            let body = body.unwrap();
            assert_eq!(body["variables"]["id"], "run-node");
            assert!(body["query"]
                .as_str()
                .unwrap()
                .contains("repositoryFileUrl"));
        } else {
            assert_eq!(method, "GET");
            assert!(body.is_none());
        }
        self.requests.lock().unwrap().push(endpoint.into());
        self.replies
            .lock()
            .unwrap()
            .get(endpoint)
            .cloned()
            .context("Source is unavailable")
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

fn runtime(id: u64, name: &str) -> Value {
    json!({"id":id,"name":name})
}
fn parsed(yaml: &str, jobs: Vec<Value>) -> Value {
    let (nodes, unmapped, partial) = definition::graph(yaml, &jobs).unwrap();
    json!({"nodes":nodes,"unmapped":unmapped,"partial":partial})
}
fn node<'a>(graph: &'a Value, id: &str) -> &'a Value {
    graph["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|node| node["id"] == id)
        .unwrap()
}
fn workflow_reference(url: &str, current_attempt: u64) -> Value {
    json!({"data":{"node":{"id":"run-node","url":"https://github.com/example/repo/actions/runs/8","runAttempt":current_attempt,
        "file":{"path":FILE_PATH,"repositoryName":"example/repo","repositoryFileUrl":url}}}})
}
fn fixture(attempt: u64) -> (tempfile::TempDir, Manager, Arc<Fake>) {
    let temp = tempfile::tempdir().unwrap();
    let backend = Arc::new(Fake::default());
    let manager = Manager::new(temp.path().join("data"), backend.clone()).unwrap();
    backend.reply(&format!("/repos/example/repo/actions/runs/8/attempts/{attempt}"), json!({
        "id":8,"node_id":"run-node","run_attempt":attempt,"event":"pull_request","path":FILE_PATH,
        "head_sha":"2222222222222222222222222222222222222222"
    }));
    backend.reply(
        &format!("/repos/example/repo/actions/runs/8/attempts/{attempt}/jobs?per_page=100&page=1"),
        json!({"total_count":1,"jobs":[runtime(70,"Build")]}),
    );
    backend.reply(
        "/graphql",
        workflow_reference(
            &format!("https://github.com/example/repo/blob/{SHA}/{FILE_PATH}"),
            3,
        ),
    );
    let yaml = "jobs:\n  build:\n    name: Build\n    runs-on: ubuntu-latest\n";
    backend.reply(&format!("/repos/example/repo/contents/{FILE_PATH}?ref={SHA}"), json!({
        "type":"file","path":FILE_PATH,"size":yaml.len(),"encoding":"base64","content":STANDARD.encode(yaml)
    }));
    (temp, manager, backend)
}

#[test]
fn dependencies_are_source_defined_and_parallel_jobs_stay_parallel() {
    let graph = parsed(
        r#"
jobs:
  prepare:
    name: Prepare
  lint:
    name: Lint
  build:
    name: Build
    needs: prepare
  deploy:
    name: Deploy
    needs: [build, lint]
"#,
        vec![
            runtime(4, "Deploy"),
            runtime(3, "Build"),
            runtime(2, "Lint"),
            runtime(1, "Prepare"),
        ],
    );
    assert_eq!(node(&graph, "prepare")["needs"], json!([]));
    assert_eq!(node(&graph, "lint")["needs"], json!([]));
    assert_eq!(node(&graph, "build")["needs"], json!(["prepare"]));
    assert_eq!(node(&graph, "deploy")["needs"], json!(["build", "lint"]));
    assert_eq!(node(&graph, "build")["job_ids"], json!([3]));
    assert_eq!(graph["partial"], false);
}

#[test]
fn matrix_names_group_only_valid_static_variants_including_include_and_exclude() {
    let graph = parsed(
        r#"
jobs:
  test:
    name: Test ${{ matrix.os }} / ${{ matrix.version }}
    strategy:
      matrix:
        os: [linux, macos]
        version: [20, 22]
        exclude:
          - os: linux
            version: 20
        include:
          - os: windows
            version: 24
  release:
    needs: test
"#,
        vec![
            runtime(1, "Test linux / 22"),
            runtime(2, "Test macos / 20"),
            runtime(3, "Test windows / 24"),
            runtime(4, "Test linux / 20"),
            runtime(5, "release"),
        ],
    );
    assert_eq!(node(&graph, "test")["job_ids"], json!([1, 2, 3]));
    assert_eq!(node(&graph, "test")["matrix"], true);
    assert_eq!(graph["unmapped"], json!([4]));
    assert_eq!(node(&graph, "release")["needs"], json!(["test"]));
}

#[test]
fn default_matrix_names_do_not_depend_on_yaml_map_sorting() {
    let graph = parsed("jobs:\n  test:\n    strategy:\n      matrix:\n        version: [20]\n        os: [linux, macos]\n",
        vec![runtime(1,"test (20, linux)"),runtime(2,"test (20, macos)"),runtime(3,"test (20, windows)")]);
    assert_eq!(node(&graph, "test")["job_ids"], json!([1, 2]));
    assert_eq!(graph["unmapped"], json!([3]));
}

#[test]
fn strategy_without_matrix_remains_an_individual_job() {
    let graph = parsed(
        "jobs:\n  test:\n    strategy:\n      fail-fast: false\n",
        vec![runtime(1, "test")],
    );
    assert_eq!(node(&graph, "test")["matrix"], false);
    assert_eq!(node(&graph, "test")["job_ids"], json!([1]));
    assert_eq!(graph["partial"], false);
}

#[test]
fn matrix_expansion_and_rendered_names_have_bounded_output() {
    let repeated_name = "${{ matrix.label }}".repeat(100);
    let large_value = "x".repeat(4096);
    let yaml = format!(
        "jobs:\n  test:\n    name: '{repeated_name}'\n    strategy:\n      matrix:\n        label: ['{large_value}']\n"
    );
    let graph = parsed(&yaml, vec![runtime(1, "Test")]);
    assert_eq!(graph["partial"], true);
    assert_eq!(graph["unmapped"], json!([1]));

    // The source is small, but the Cartesian rows would duplicate its long value.
    let yaml = format!(
        "jobs:\n  test:\n    strategy:\n      matrix:\n        label: ['{}']\n        variant: [{}]\n",
        "x".repeat(20_000),
        (0..64).map(|value| value.to_string()).collect::<Vec<_>>().join(", ")
    );
    assert_eq!(parsed(&yaml, vec![])["partial"], true);

    // Each job fits its budget, but all matchers together must remain bounded too.
    let mut yaml = String::from("jobs:\n");
    for index in 0..40 {
        yaml.push_str(&format!(
            "  test{index}:\n    name: '{}${{{{ matrix.n }}}}'\n    strategy:\n      matrix:\n        n: [1, 2, 3, 4, 5, 6, 7, 8]\n",
            "x".repeat(900)
        ));
    }
    assert_eq!(parsed(&yaml, vec![])["partial"], true);
}

#[test]
fn duplicate_display_names_do_not_create_false_runtime_associations() {
    let graph = parsed(
        "jobs:\n  first:\n    name: Build\n  second:\n    name: Build\n    needs: first\n",
        vec![runtime(1, "Build"), runtime(2, "Build")],
    );
    assert_eq!(graph["unmapped"], json!([1, 2]));
    assert_eq!(node(&graph, "first")["job_ids"], json!([]));
    assert_eq!(node(&graph, "second")["needs"], json!(["first"]));
    let graph = parsed(
        "jobs:\n  first:\n    name: Build\n",
        vec![runtime(1, "Build"), runtime(2, "Build")],
    );
    assert_eq!(graph["unmapped"], json!([1, 2]));
}

#[test]
fn expressions_and_reusable_workflows_remain_explicitly_unmapped() {
    for extra in [
        "name: ${{ inputs.name }}",
        "uses: example/shared/.github/workflows/test.yml@main",
        "strategy:\n      matrix: ${{ fromJSON(needs.prepare.outputs.matrix) }}",
    ] {
        let graph = parsed(
            &format!(
                "jobs:\n  prepare:\n    name: Build\n  dynamic:\n    needs: prepare\n    {extra}\n"
            ),
            vec![runtime(1, "Build"), runtime(2, "Dynamic test")],
        );
        assert_eq!(graph["partial"], true);
        assert_eq!(graph["unmapped"], json!([1, 2]));
        assert_eq!(node(&graph, "dynamic")["needs"], json!(["prepare"]));
    }
}

#[test]
fn malformed_or_cyclic_dependencies_do_not_produce_a_graph() {
    for yaml in [
        "jobs: {a: {needs: absent}}",
        "jobs: {a: {needs: b}, b: {needs: a}}",
        "jobs: {a: {needs: 42}}",
        "jobs: {a: {needs: a}}",
        "jobs: {a: {}, a: {needs: b}}",
        "jobs: {a: {}}\n---\njobs: {b: {}}",
    ] {
        assert!(definition::graph(yaml, &[]).is_err(), "{yaml}");
    }
    assert!(definition::graph(&"x".repeat(source::MAX_SOURCE_BYTES + 1), &[]).is_err());
}

#[test]
fn yaml_anchors_work_and_step_scripts_cannot_introduce_fake_edges() {
    let graph = parsed(
        r#"
on: push
jobs:
  first:
    runs-on: &host ubuntu-latest
    steps:
      - run: |
          jobs:
            imaginary:
              needs: second
  second:
    runs-on: *host
    needs: first
"#,
        vec![runtime(1, "first"), runtime(2, "second")],
    );
    assert_eq!(graph["nodes"].as_array().unwrap().len(), 2);
    assert_eq!(graph["partial"], false);
}

#[test]
fn pull_request_graph_uses_verified_executed_source_not_run_head_sha() {
    let (_temp, manager, backend) = fixture(2);
    let graph = run_graph(&manager, "example/repo", 8, Some(2)).unwrap();
    assert_eq!(graph["state"], "complete");
    assert_eq!(graph["source"]["sha"], SHA);
    assert_eq!(graph["source"]["run_attempt"], 2);
    assert_eq!(node(&graph, "build")["job_ids"], json!([70]));
    let requests = backend.requests.lock().unwrap();
    assert!(requests
        .iter()
        .all(|request| !request.contains("2222222222")));
    assert!(requests.iter().all(|request| !request.contains("/logs")));
}

#[test]
fn previous_attempt_uses_original_root_file_and_attempt_specific_jobs() {
    let (_temp, manager, backend) = fixture(1);
    let graph = run_graph(&manager, "example/repo", 8, Some(1)).unwrap();
    assert_eq!(graph["state"], "complete");
    assert_eq!(graph["source"]["run_attempt"], 1);
    assert!(backend
        .requests
        .lock()
        .unwrap()
        .iter()
        .any(|path| path.contains("/attempts/1/jobs")));
}

#[test]
fn mutable_or_foreign_source_urls_are_unavailable_without_fallback() {
    for url in [
        format!("https://github.com/example/repo/blob/main/{FILE_PATH}"),
        format!("https://evil.example/example/repo/blob/{SHA}/{FILE_PATH}"),
        format!("https://github.com/example/repo/blob/{SHA}/.github/workflows/other.yml"),
    ] {
        let (_temp, manager, backend) = fixture(2);
        backend.reply("/graphql", workflow_reference(&url, 3));
        let graph = run_graph(&manager, "example/repo", 8, Some(2)).unwrap();
        assert_eq!(graph["state"], "unavailable");
        assert_eq!(graph["unmapped_job_ids"], json!([70]));
        assert!(backend
            .requests
            .lock()
            .unwrap()
            .iter()
            .all(|path| !path.contains("/contents/")));
    }
}

#[test]
fn missing_graphql_reference_and_oversized_content_are_bounded_failures() {
    let (_temp, manager, backend) = fixture(2);
    backend.reply(
        "/graphql",
        json!({"data":{"node":null},"errors":[{"message":"not available"}]}),
    );
    assert_eq!(
        run_graph(&manager, "example/repo", 8, Some(2)).unwrap()["state"],
        "unavailable"
    );
    let (_temp, manager, backend) = fixture(2);
    backend.reply(&format!("/repos/example/repo/contents/{FILE_PATH}?ref={SHA}"),json!({
        "type":"file","path":FILE_PATH,"size":source::MAX_SOURCE_BYTES+1,"encoding":"base64","content":""
    }));
    let graph = run_graph(&manager, "example/repo", 8, Some(2)).unwrap();
    assert_eq!(graph["state"], "unavailable");
    assert!(graph["message"].as_str().unwrap().contains("256 KiB"));
}

#[test]
fn deleted_revision_does_not_fall_back_to_branch_and_attempt_mismatch_is_rejected() {
    let (_temp, manager, backend) = fixture(2);
    backend.replies.lock().unwrap().remove(&format!(
        "/repos/example/repo/contents/{FILE_PATH}?ref={SHA}"
    ));
    let graph = run_graph(&manager, "example/repo", 8, Some(2)).unwrap();
    assert_eq!(graph["state"], "unavailable");
    assert_eq!(backend.requests.lock().unwrap().len(), 4);
    backend.reply(
        "/repos/example/repo/actions/runs/8/attempts/2",
        json!({"id":8,"run_attempt":3}),
    );
    assert!(run_graph(&manager, "example/repo", 8, Some(2)).is_err());
}
