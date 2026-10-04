use super::*;

fn release_metadata() -> Value {
    let base = "https://github.com/SuicaLondon/mactions/releases/download/v1.2.3";
    json!({
        "tag_name": "v1.2.3", "draft": false, "prerelease": false,
        "assets": [
            {"name": "mactions-1.2.3-macos-arm64.tar.gz", "browser_download_url": format!("{base}/mactions-1.2.3-macos-arm64.tar.gz"), "digest": format!("sha256:{}", "a".repeat(64))},
            {"name": "mactions-1.2.3-macos-arm64.tar.gz.sha256", "browser_download_url": format!("{base}/mactions-1.2.3-macos-arm64.tar.gz.sha256")},
        ]
    })
}

#[test]
fn release_requires_stable_version_and_exact_official_assets() {
    let metadata = release_metadata();
    let release = parse_release(&metadata).unwrap();
    assert_eq!(release.version, "1.2.3");
    assert_eq!(release.digest, Some("a".repeat(64)));
    assert!(version_parts("1.10.0").unwrap() > version_parts("1.9.9").unwrap());
    let mut metadata = metadata;
    metadata["assets"][0]["browser_download_url"] = json!("https://example.com/package.tar.gz");
    assert!(parse_release(&metadata).is_err());
    metadata = release_metadata();
    metadata["prerelease"] = json!(true);
    assert!(parse_release(&metadata).is_err());
    metadata = release_metadata();
    metadata["tag_name"] = json!("v../../escape");
    assert!(parse_release(&metadata).is_err());
    metadata = release_metadata();
    metadata["assets"].as_array_mut().unwrap().pop();
    assert!(parse_release(&metadata).is_err());
}

#[test]
fn checksum_requires_exact_archive_name_and_a_complete_sha256() {
    let filename = "mactions-1.2.3-macos-arm64.tar.gz";
    assert_eq!(
        checksum_entry(&format!("{}  {filename}\n", "A".repeat(64)), filename).unwrap(),
        "a".repeat(64)
    );
    assert!(checksum_entry(&format!("{} other.tar.gz", "a".repeat(64)), filename).is_err());
    assert!(checksum_entry(&format!("{} {filename}", "a".repeat(63)), filename).is_err());
    assert!(checksum_entry(
        &format!(
            "{} {filename}\n{} other.tar.gz",
            "a".repeat(64),
            "b".repeat(64)
        ),
        filename
    )
    .is_err());
}

#[test]
fn archive_rejects_traversal_wrong_root_links_and_missing_manifest() {
    let root = "mactions-1.2.3-macos-arm64";
    let entries = format!("{root}/\n{root}/mactions\n{root}/libexec/gh\n{root}/manifest.json\n");
    let details = "drwxr-xr-x root\n-rwxr-xr-x manager\n-rwxr-xr-x gh\n-rw-r--r-- manifest\n";
    assert!(validate_archive(&entries, details, root).is_ok());
    for unsafe_entry in [
        format!("{root}/../outside"),
        "/absolute/file".into(),
        format!("{root}-other/file"),
    ] {
        assert!(validate_archive(&format!("{entries}{unsafe_entry}\n"), details, root).is_err());
    }
    assert!(validate_archive(&entries, "lrwxr-xr-x link -> outside\n", root).is_err());
    assert!(validate_archive(&entries, "hrwxr-xr-x hard link\n", root).is_err());
    assert!(validate_archive(
        &format!("{root}/mactions\n{root}/libexec/gh\n"),
        details,
        root
    )
    .is_err());
}

fn installation() -> tempfile::TempDir {
    let directory = tempfile::tempdir().unwrap();
    for version in ["1.0.0", "1.1.0", "1.2.0"] {
        fs::create_dir_all(directory.path().join("releases").join(version)).unwrap();
    }
    symlink("releases/1.1.0", directory.path().join("current")).unwrap();
    symlink("releases/1.0.0", directory.path().join("previous")).unwrap();
    directory
}

#[test]
fn activation_keeps_previous_release_and_does_not_touch_runner_data() {
    let directory = installation();
    let data = directory.path().join("runner-workspace");
    fs::write(&data, "keep this job").unwrap();
    let mut activated = Vec::new();
    activate(directory.path(), "1.2.0", |version| {
        activated.push(version.to_string());
        assert_eq!(
            fs::read_link(directory.path().join("current")).unwrap(),
            Path::new("releases/1.2.0")
        );
        Ok(())
    })
    .unwrap();
    assert_eq!(activated, ["1.2.0"]);
    assert_eq!(
        fs::read_link(directory.path().join("previous")).unwrap(),
        Path::new("releases/1.1.0")
    );
    assert!(directory.path().join("releases/1.1.0").is_dir());
    assert_eq!(fs::read_to_string(data).unwrap(), "keep this job");
}

#[test]
fn failed_activation_restores_both_links_and_restarts_old_version() {
    let directory = installation();
    let mut activated = Vec::new();
    let error = activate(directory.path(), "1.2.0", |version| {
        activated.push(version.to_string());
        if version == "1.2.0" {
            bail!("New manager health check failed");
        }
        Ok(())
    })
    .unwrap_err();
    assert!(error.to_string().contains("previous manager was restored"));
    assert_eq!(activated, ["1.2.0", "1.1.0"]);
    assert_eq!(
        fs::read_link(directory.path().join("current")).unwrap(),
        Path::new("releases/1.1.0")
    );
    assert_eq!(
        fs::read_link(directory.path().join("previous")).unwrap(),
        Path::new("releases/1.0.0")
    );
}

#[test]
fn failed_first_update_removes_temporary_previous_link() {
    let directory = installation();
    fs::remove_file(directory.path().join("previous")).unwrap();
    assert!(activate(directory.path(), "1.2.0", |version| {
        if version == "1.2.0" {
            bail!("Startup failed");
        }
        Ok(())
    })
    .is_err());
    assert!(fs::symlink_metadata(directory.path().join("previous")).is_err());
    assert_eq!(
        fs::read_link(directory.path().join("current")).unwrap(),
        Path::new("releases/1.1.0")
    );
}

#[test]
fn status_distinguishes_a_running_update_from_an_exited_helper() {
    let directory = tempfile::tempdir().unwrap();
    assert_eq!(status(directory.path()).unwrap()["state"], "idle");
    save_status(
        directory.path(),
        &json!({"state": "running", "message": "Verifying"}),
    )
    .unwrap();
    let lock = open_lock(directory.path()).unwrap();
    lock.try_lock_exclusive().unwrap();
    assert_eq!(status(directory.path()).unwrap()["state"], "running");
    drop(lock);
    assert_eq!(status(directory.path()).unwrap()["state"], "failed");
    let saved: Value =
        serde_json::from_slice(&fs::read(directory.path().join("update.json")).unwrap()).unwrap();
    assert_eq!(saved["state"], "failed");
    save_status(
        directory.path(),
        &json!({"state": "running", "pid": std::process::id(),
            "process_identity": service::process_identity(std::process::id()).unwrap().unwrap(),
            "message": "Starting"}),
    )
    .unwrap();
    assert_eq!(status(directory.path()).unwrap()["state"], "running");
}

#[test]
fn status_rejects_a_reused_live_pid_with_a_different_start_identity() {
    let directory = tempfile::tempdir().unwrap();
    save_status(
        directory.path(),
        &json!({"state":"running","pid":std::process::id(),
            "process_identity":"a previous process with this PID","message":"Starting"}),
    )
    .unwrap();
    assert_eq!(status(directory.path()).unwrap()["state"], "failed");
    let saved: Value =
        serde_json::from_slice(&fs::read(directory.path().join("update.json")).unwrap()).unwrap();
    assert_eq!(saved["state"], "failed");
}

#[test]
fn install_marker_and_release_containment_are_required_before_mutation() {
    let directory = installation();
    assert!(validate_installation(directory.path()).is_err());
    fs::write(
        directory.path().join("install.json"),
        json!({"schema": 1, "source": "script"}).to_string(),
    )
    .unwrap();
    assert!(validate_installation(directory.path()).is_ok());
    let foreign = tempfile::tempdir().unwrap();
    fs::remove_file(directory.path().join("current")).unwrap();
    symlink(foreign.path(), directory.path().join("current")).unwrap();
    assert!(validate_installation(directory.path()).is_err());
}

#[test]
fn cached_release_requires_the_exact_verified_regular_files() {
    let directory = tempfile::tempdir().unwrap();
    let stage = directory.path().join("stage");
    let target = directory.path().join("target");
    for root in [&stage, &target] {
        fs::create_dir_all(root.join("libexec")).unwrap();
        for filename in ["mactions", "libexec/gh", "manifest.json"] {
            fs::write(root.join(filename), filename).unwrap();
        }
    }
    assert!(verify_cached_bundle(&stage, &target).is_ok());
    fs::write(target.join("mactions"), "changed").unwrap();
    assert!(verify_cached_bundle(&stage, &target).is_err());
    fs::remove_file(target.join("mactions")).unwrap();
    symlink(stage.join("mactions"), target.join("mactions")).unwrap();
    assert!(verify_cached_bundle(&stage, &target).is_err());
}

#[test]
fn incompatible_manifest_is_rejected_before_running_downloaded_binaries() {
    let directory = tempfile::tempdir().unwrap();
    fs::create_dir_all(directory.path().join("libexec")).unwrap();
    fs::write(directory.path().join("mactions"), "do not execute").unwrap();
    fs::write(directory.path().join("libexec/gh"), "do not execute").unwrap();
    for manifest in [
        json!({"version": "1.2.3", "arch": "arm64", "min_macos": 13}),
        json!({"version": "1.2.3", "arch": "x64", "min_macos": 12}),
        json!({"version": "9.9.9", "arch": "arm64", "min_macos": 12}),
        json!({"version": "1.2.3", "arch": "arm64", "min_macos": 11}),
    ] {
        fs::write(directory.path().join("manifest.json"), manifest.to_string()).unwrap();
        let error = validate_bundle(directory.path(), "1.2.3", 12).unwrap_err();
        assert!(
            error.to_string().contains("manifest") || error.to_string().contains("requires macOS")
        );
    }
}

#[test]
fn busy_runner_operation_prevents_update_and_persists_failure() {
    let directory = tempfile::tempdir().unwrap();
    let _operation = super::super::operation_guard(directory.path()).unwrap();
    let error = run(directory.path()).unwrap_err();
    assert!(error.to_string().contains("Another management operation"));
    let saved = status(directory.path()).unwrap();
    assert_eq!(saved["state"], "failed");
    assert!(saved["message"]
        .as_str()
        .unwrap()
        .contains("Another management operation"));
}
