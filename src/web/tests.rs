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
fn manager_health_identifies_the_exact_version_and_data_directory() {
    let (_temp, manager) = manager();
    let mut request = TestRequest::new()
        .with_method(Method::Get)
        .with_path("/api/manager/health")
        .into();
    let (status, _, body) = route(&mut request, &manager, &Auth::default()).unwrap();
    let value: serde_json::Value = serde_json::from_str(&body).unwrap();
    assert_eq!(status, 200);
    assert_eq!(value["version"], env!("CARGO_PKG_VERSION"));
    assert_eq!(value["data_dir"], manager.root.to_str().unwrap());
}

#[test]
fn manager_settings_save_on_the_host_without_touching_runner_records() {
    let (_temp, manager) = manager();
    let mut request = TestRequest::new()
        .with_method(Method::Post)
        .with_path("/api/manager/settings")
        .with_body("{\"lan_access\":true}")
        .with_header(header("Content-Type", "application/json"))
        .with_header(header("X-Mactions", "1"))
        .into();
    let (_, _, body) = route(&mut request, &manager, &Auth::default()).unwrap();
    let value: serde_json::Value = serde_json::from_str(&body).unwrap();
    assert_eq!(value["lan_access"], true);
    assert_eq!(value["managed"], false);
    assert_eq!(
        crate::installation::config::address(&manager.root).unwrap(),
        "0.0.0.0:8787"
    );
    assert!(manager.records().unwrap().is_empty());
    assert!(!manager.root.join("update.json").exists());
}

#[test]
fn manager_update_and_settings_enforce_mutation_validation() {
    let (_temp, manager) = manager();
    for endpoint in ["settings", "update"] {
        let mut request = TestRequest::new()
            .with_method(Method::Post)
            .with_path(&format!("/api/manager/{endpoint}"))
            .with_body("{\"lan_access\":true}")
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
    assert!(!manager.root.join("manager.json").exists());
    assert!(!manager.root.join("update.json").exists());
    let mut request = TestRequest::new()
        .with_method(Method::Post)
        .with_path("/api/manager/settings")
        .with_body("{}")
        .with_header(header("Content-Type", "application/json"))
        .with_header(header("X-Mactions", "1"))
        .into();
    assert!(route(&mut request, &manager, &Auth::default())
        .unwrap_err()
        .to_string()
        .contains("lan_access boolean"));
}

#[test]
fn unmanaged_browser_updates_fail_before_creating_an_update_process() {
    let (_temp, manager) = manager();
    let mut request = TestRequest::new()
        .with_method(Method::Post)
        .with_path("/api/manager/update")
        .with_body("{}")
        .with_header(header("Content-Type", "application/json"))
        .with_header(header("X-Mactions", "1"))
        .into();
    assert!(route(&mut request, &manager, &Auth::default())
        .unwrap_err()
        .to_string()
        .contains("installation script or Homebrew"));
    assert!(!manager.root.join("update.json").exists());
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
