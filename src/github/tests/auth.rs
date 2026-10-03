use super::*;

#[test]
fn device_login_is_pollable_and_raw_cli_output_is_not_exposed() {
    use crate::native::Native;
    use std::{fs, os::unix::fs::PermissionsExt};
    let dir = tempfile::tempdir().unwrap();
    let executable = dir.path().join("gh-fixture");
    fs::write(&executable,"#!/bin/sh\nprintf '! First copy your one-time code: ABCD-1234\\nprivate-output-never-returned\\n' >&2\nsleep 1\n").unwrap();
    fs::set_permissions(&executable, fs::Permissions::from_mode(0o755)).unwrap();
    let manager = Manager::new(
        dir.path().join("data"),
        Arc::new(Native {
            root: dir.path().into(),
            gh: executable,
        }),
    )
    .unwrap();
    let auth = Auth::default();
    assert_eq!(auth.start(&manager, false).unwrap()["status"], "pending");
    let start = Instant::now();
    while auth.status()["code"].is_null() && start.elapsed() < Duration::from_secs(3) {
        thread::sleep(Duration::from_millis(20));
    }
    assert_eq!(auth.status()["code"], "ABCD-1234");
    assert!(!auth.status().to_string().contains("private-output"));
    assert_eq!(auth.start(&manager, false).unwrap()["code"], "ABCD-1234");
    while auth.status()["status"] == "pending" && start.elapsed() < Duration::from_secs(4) {
        thread::sleep(Duration::from_millis(20));
    }
    assert_eq!(auth.status()["status"], "complete");
    assert!(auth.status()["code"].is_null());
    assert!(auth.state.lock().unwrap().pid.is_none());
    auth.start(&manager, false).unwrap();
    assert_eq!(auth.cancel()["status"], "idle");
    thread::sleep(Duration::from_millis(300));
    assert_eq!(auth.status()["status"], "idle");
}
#[test]
fn exposes_only_device_code_not_cli_output() {
    assert_eq!(
        device_code("! First copy your one-time code: ABCD-1234\nsecret"),
        Some("ABCD-1234".into())
    );
    assert_eq!(device_code("ghp_secret ABCD-1234"), None);
}
