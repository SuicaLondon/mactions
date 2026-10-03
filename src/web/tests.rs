use super::*;
use crate::native::Native;
use tiny_http::TestRequest;
fn manager() -> (tempfile::TempDir, Manager) {
    let temp = tempfile::tempdir().unwrap();
    let native = Native {
        root: temp.path().into(),
        gh: "/does-not-exist".into(),
    };
    let manager = Manager::new(temp.path().into(), Arc::new(native)).unwrap();
    (temp, manager)
}
#[test]
fn rejects_cross_origin_mutations_before_touching_runner_state() {
    let (_temp, manager) = manager();
    let mut request = TestRequest::new()
        .with_method(Method::Post)
        .with_path("/api/runners/1/delete")
        .with_body("{\"confirm\":true}")
        .with_header(header("Content-Type", "application/json"))
        .with_header(header("X-Mactions", "1"))
        .with_header(header("Host", "localhost:8787"))
        .with_header(header("Origin", "https://unrelated.example"))
        .into();
    assert!(route(&mut request, &manager, &Auth::default())
        .unwrap_err()
        .to_string()
        .contains("Cross-origin"));
}
#[test]
fn rejects_form_posts_and_unconfirmed_deletions() {
    let (_temp, manager) = manager();
    let mut form = TestRequest::new()
        .with_method(Method::Post)
        .with_path("/api/runners")
        .with_body("{}")
        .into();
    assert!(route(&mut form, &manager, &Auth::default())
        .unwrap_err()
        .to_string()
        .contains("X-Mactions"));
    let mut deletion = TestRequest::new()
        .with_method(Method::Post)
        .with_path("/api/runners/1/delete")
        .with_body("{}")
        .with_header(header("Content-Type", "application/json"))
        .with_header(header("X-Mactions", "1"))
        .into();
    assert!(route(&mut deletion, &manager, &Auth::default())
        .unwrap_err()
        .to_string()
        .contains("confirmation"));
}

#[test]
fn activity_scope_rejects_repository_outside_the_selected_organization() {
    let (_temp, manager) = manager();
    for endpoint in [
        "runners",
        "runs",
        "work",
        "repositories",
        "run",
        "run-graph",
        "job",
        "job-history",
        "job-logs",
    ] {
        let mut request = TestRequest::new().with_method(Method::Get)
                .with_path(&format!("/api/activity/{endpoint}?organization=example&repository=other%2Frepo&run_id=1&job_id=1&workflow_id=1&job_name=Build")).into();
        assert!(route(&mut request, &manager, &Auth::default())
            .unwrap_err()
            .to_string()
            .contains("selected organization"));
    }
}
