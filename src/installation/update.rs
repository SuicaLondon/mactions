//! Manual manager updates. Runner installations and lifecycle are independent.
use super::service::{self, InstallSource};
use anyhow::{bail, ensure, Context, Result};
use fs2::FileExt;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::Read,
    os::unix::fs::symlink,
    path::{Component, Path},
    process::Command,
    thread,
    time::{Duration, Instant},
};

const RELEASES_API: &str = "https://api.github.com/repos/SuicaLondon/mactions/releases/latest";
const RELEASES_URL: &str = "https://github.com/SuicaLondon/mactions/releases";

#[derive(Debug)]
struct Release {
    version: String,
    filename: String,
    archive_url: String,
    checksum_url: String,
    digest: Option<String>,
}

#[derive(Deserialize)]
struct Manifest {
    version: String,
    arch: String,
    min_macos: u32,
}

/// Check only when explicitly requested; this does not schedule or apply updates.
pub fn check(root: &Path) -> Result<Value> {
    let source = service::source()?;
    let release = latest_release()?;
    let available = version_parts(&release.version)? > version_parts(env!("CARGO_PKG_VERSION"))?;
    let can_update = !matches!(source, InstallSource::Manual { .. });
    let message = match &source {
        InstallSource::Manual { .. } => {
            "Install with the official script or Homebrew to enable managed updates."
        }
        InstallSource::Homebrew { .. } => {
            "Updates use brew upgrade mactions; only an already running manager service restarts."
        }
        InstallSource::Script { .. } => {
            "Updates replace the manager bundle and preserve all runners and data."
        }
    };
    // Surface invalid service configuration before offering an update that cannot restart safely.
    if can_update {
        service::status(root)?;
    }
    Ok(json!({
        "source": source_name(&source),
        "current_version": env!("CARGO_PKG_VERSION"),
        "latest_version": release.version,
        "available": available,
        "can_update": can_update,
        "message": message,
        "release_url": format!("{RELEASES_URL}/tag/v{}", release.version),
    }))
}

/// The CLI or detached browser helper owns this operation until activation finishes.
pub fn run(root: &Path) -> Result<Value> {
    fs::create_dir_all(root)?;
    let lock = open_lock(root)?;
    lock.try_lock_exclusive()
        .context("Another manager update is already running")?;
    let mut state = json!({
        "state": "running", "from_version": env!("CARGO_PKG_VERSION"),
        "to_version": null, "message": "Checking the latest stable release.",
        "pid": std::process::id(),
        "process_identity": service::process_identity(std::process::id())?,
    });
    save_status(root, &state)?;
    let result = super::operation_guard(root).and_then(|_guard| update(root, &mut state));
    match result {
        Ok(message) => {
            state["state"] = json!("complete");
            state["message"] = json!(message);
            save_status(root, &state)?;
            Ok(state)
        }
        Err(error) => {
            state["state"] = json!("failed");
            state["message"] = json!(format!("{error:#}"));
            save_status(root, &state)?;
            Err(error)
        }
    }
}

pub fn status(root: &Path) -> Result<Value> {
    let path = root.join("update.json");
    if !path.exists() {
        return Ok(json!({"state": "idle", "message": "No manager update has been requested."}));
    }
    let mut state: Value = serde_json::from_slice(&fs::read(&path)?)
        .context("Could not read the saved manager update status")?;
    if state["state"] == "running" {
        let lock = open_lock(root)?;
        if lock.try_lock_exclusive().is_ok() && !helper_running(&state)? {
            state["state"] = json!("failed");
            state["message"] =
                json!("The update process exited before completion. Run mactions update to retry.");
            save_status(root, &state)?;
        }
    }
    Ok(state)
}

fn helper_running(state: &Value) -> Result<bool> {
    let pid = state["pid"]
        .as_u64()
        .and_then(|pid| u32::try_from(pid).ok())
        .filter(|pid| *pid > 0);
    let identity = state["process_identity"].as_str();
    if let (Some(pid), Some(identity)) = (pid, identity) {
        return Ok(service::process_identity(pid)?.as_deref() == Some(identity));
    }
    Ok(false)
}

fn update(root: &Path, state: &mut Value) -> Result<String> {
    ensure!(
        cfg!(target_os = "macos") && std::env::consts::ARCH == "aarch64",
        "Managed updates require an Apple Silicon Mac"
    );
    let source = service::source()?;
    ensure!(!matches!(source, InstallSource::Manual { .. }), "This manual installation cannot update itself. Use the official installer or brew upgrade mactions.");
    let release = latest_release()?;
    state["to_version"] = json!(release.version);
    if version_parts(&release.version)? <= version_parts(env!("CARGO_PKG_VERSION"))? {
        return Ok("The installed manager is already current.".into());
    }
    let before = service::status(root)?;
    let was_running = before["running"].as_bool().unwrap_or(false);
    let url = before["url"]
        .as_str()
        .context("Manager service has no local URL")?;
    state["message"] = json!("Downloading and verifying the manager update.");
    save_status(root, state)?;
    match source {
        InstallSource::Script { directory } => {
            let directory = validate_installation(&directory)?;
            let install_lock = open_lock(&directory)?;
            install_lock
                .try_lock_exclusive()
                .context("Another update is already changing this manager installation")?;
            let current = directory.join("current").canonicalize()?;
            let installed_version = current
                .file_name()
                .and_then(|name| name.to_str())
                .context("Current manager release has no version")?;
            if version_parts(installed_version)? >= version_parts(&release.version)? {
                state["to_version"] = json!(installed_version);
                if was_running {
                    service::restart(root)?;
                    wait_for_health(url, installed_version, root)?;
                }
                return Ok("The current manager release is already installed. All runners and data were preserved.".into());
            }
            let stage = tempfile::Builder::new()
                .prefix(".update-")
                .tempdir_in(&directory)?;
            let bundle = download_bundle(&release, stage.path())?;
            let target = directory.join("releases").join(&release.version);
            fs::create_dir_all(directory.join("releases"))?;
            if fs::symlink_metadata(&target).is_ok() {
                ensure!(
                    fs::symlink_metadata(&target)?.file_type().is_dir()
                        && target.canonicalize()?.parent()
                            == Some(directory.join("releases").as_path()),
                    "An existing release target is outside this managed installation"
                );
                verify_cached_bundle(&bundle, &target)?;
            } else {
                fs::rename(&bundle, &target)
                    .context("Could not save the verified manager release")?;
            }
            state["message"] = json!("Activating the verified manager release.");
            save_status(root, state)?;
            activate(&directory, &release.version, |version| {
                if was_running {
                    service::restart(root)?;
                    wait_for_health(url, version, root)?;
                }
                Ok(())
            })?;
        }
        InstallSource::Homebrew { brew, executable } => {
            let output = Command::new(brew)
                .args(["upgrade", "mactions"])
                .status()
                .context("Could not run brew upgrade mactions")?;
            ensure!(
                output.success(),
                "Homebrew update failed. Inspect the update log and retry brew upgrade mactions."
            );
            let reported = checked(Command::new(executable).arg("--version"))?;
            ensure!(reported.trim() == format!("mactions {}", release.version), "Homebrew has not installed the latest manager release yet. Run brew update and retry brew upgrade mactions.");
            if was_running {
                service::restart(root)?;
                wait_for_health(url, &release.version, root)
                    .context("Homebrew completed, but the manager health check failed; retry mactions service restart")?;
            }
        }
        InstallSource::Manual { .. } => unreachable!("Manual installations were rejected above"),
    }
    if was_running {
        Ok("The manager update completed. Runners and their jobs were preserved.".into())
    } else {
        Ok("The manager update completed. Reopen any manually started manager to use it; stopped services and all runners were preserved.".into())
    }
}

fn validate_installation(directory: &Path) -> Result<std::path::PathBuf> {
    let directory = directory.canonicalize()?;
    let marker = directory.join("install.json");
    ensure!(
        fs::symlink_metadata(&marker)?.file_type().is_file(),
        "This directory has no regular managed installation marker"
    );
    let marker: Value = serde_json::from_slice(&fs::read(marker)?)?;
    ensure!(
        marker["schema"] == 1 && marker["source"] == "script",
        "This directory is not owned by the official script installer"
    );
    let releases = directory.join("releases");
    ensure!(
        releases.canonicalize()? == releases,
        "The managed release directory must not point outside this installation"
    );
    let current = directory.join("current").canonicalize()?;
    ensure!(
        current.parent() == Some(releases.as_path()),
        "Current manager release is outside this installation"
    );
    Ok(directory)
}

fn latest_release() -> Result<Release> {
    let text = checked(Command::new("/usr/bin/curl").args([
        "--fail",
        "--silent",
        "--show-error",
        "--proto",
        "=https",
        "--connect-timeout",
        "15",
        "--max-time",
        "45",
        "-H",
        "Accept: application/vnd.github+json",
        "-H",
        "User-Agent: mactions",
        RELEASES_API,
    ]))?;
    parse_release(&serde_json::from_str(&text).context("Invalid manager release metadata")?)
}

fn parse_release(value: &Value) -> Result<Release> {
    ensure!(
        value["draft"] == false && value["prerelease"] == false,
        "Only published stable manager releases can be installed"
    );
    let version = value["tag_name"]
        .as_str()
        .and_then(|tag| tag.strip_prefix('v'))
        .context("Manager release has no valid version tag")?
        .to_string();
    version_parts(&version)?;
    let filename = format!("mactions-{version}-macos-arm64.tar.gz");
    let base = format!("{RELEASES_URL}/download/v{version}");
    let assets = value["assets"]
        .as_array()
        .context("Manager release has no downloadable assets")?;
    let archive = asset_url(assets, &filename, &base)?;
    let checksum = asset_url(assets, &format!("{filename}.sha256"), &base)?;
    let digest = archive["digest"]
        .as_str()
        .map(|digest| {
            let sha = digest
                .strip_prefix("sha256:")
                .context("Unsupported manager release checksum")?;
            validate_digest(sha)?;
            Ok::<_, anyhow::Error>(sha.to_lowercase())
        })
        .transpose()?;
    Ok(Release {
        version,
        filename,
        archive_url: archive["browser_download_url"].as_str().unwrap().into(),
        checksum_url: checksum["browser_download_url"].as_str().unwrap().into(),
        digest,
    })
}

fn asset_url<'a>(assets: &'a [Value], filename: &str, base: &str) -> Result<&'a Value> {
    let asset = assets.iter().find(|asset| asset["name"].as_str() == Some(filename))
        .with_context(|| format!("The latest release does not contain {filename}; publish a complete arm64 release first"))?;
    ensure!(
        asset["browser_download_url"].as_str() == Some(format!("{base}/{filename}").as_str()),
        "Unexpected manager release download origin"
    );
    Ok(asset)
}

fn version_parts(version: &str) -> Result<[u64; 3]> {
    let mut parts = version.split('.');
    let mut result = [0; 3];
    for number in &mut result {
        let part = parts
            .next()
            .context("Expected a stable manager version such as 1.2.3")?;
        ensure!(
            !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit()),
            "Invalid stable manager version"
        );
        *number = part
            .parse()
            .context("Manager version number is too large")?;
    }
    ensure!(parts.next().is_none(), "Invalid stable manager version");
    Ok(result)
}

fn source_name(source: &InstallSource) -> &'static str {
    match source {
        InstallSource::Script { .. } => "script",
        InstallSource::Homebrew { .. } => "homebrew",
        InstallSource::Manual { .. } => "manual",
    }
}

fn download(url: &str, destination: &Path) -> Result<()> {
    checked(
        Command::new("/usr/bin/curl")
            .args([
                "--fail",
                "--location",
                "--silent",
                "--show-error",
                "--proto",
                "=https",
                "--proto-redir",
                "=https",
                "--connect-timeout",
                "15",
                "--max-time",
                "600",
                "--output",
            ])
            .arg(destination)
            .arg(url),
    )?;
    Ok(())
}

fn download_bundle(release: &Release, stage: &Path) -> Result<std::path::PathBuf> {
    let archive = stage.join(&release.filename);
    let checksum_file = stage.join(format!("{}.sha256", release.filename));
    download(&release.checksum_url, &checksum_file)?;
    let digest = checksum_entry(&fs::read_to_string(&checksum_file)?, &release.filename)?;
    if let Some(official) = &release.digest {
        ensure!(
            &digest == official,
            "The release checksum file disagrees with GitHub's archive digest"
        );
    }
    download(&release.archive_url, &archive)?;
    ensure!(
        checksum(&archive)? == digest,
        "Manager archive checksum mismatch; nothing was installed"
    );
    let root = format!("mactions-{}-macos-arm64", release.version);
    let entries = checked(Command::new("/usr/bin/tar").arg("-tzf").arg(&archive))?;
    let details = checked(Command::new("/usr/bin/tar").arg("-tvzf").arg(&archive))?;
    validate_archive(&entries, &details, &root)?;
    checked(
        Command::new("/usr/bin/tar")
            .arg("-xzf")
            .arg(&archive)
            .arg("-C")
            .arg(stage),
    )?;
    let bundle = stage.join(root);
    validate_bundle(&bundle, &release.version, macos_major()?)?;
    Ok(bundle)
}

fn checksum_entry(text: &str, filename: &str) -> Result<String> {
    let fields: Vec<_> = text.split_whitespace().collect();
    ensure!(
        fields.len() == 2 && fields[1] == filename,
        "Invalid manager archive checksum file"
    );
    validate_digest(fields[0])?;
    Ok(fields[0].to_lowercase())
}

fn validate_digest(digest: &str) -> Result<()> {
    ensure!(
        digest.len() == 64 && digest.bytes().all(|byte| byte.is_ascii_hexdigit()),
        "Invalid manager SHA-256 checksum"
    );
    Ok(())
}

fn checksum(path: &Path) -> Result<String> {
    let mut file = File::open(path)?;
    let mut hash = Sha256::new();
    let mut buffer = [0; 65536];
    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hash.finalize()))
}

fn validate_archive(entries: &str, details: &str, root: &str) -> Result<()> {
    let mut required = [false; 3];
    for entry in entries.lines() {
        let path = Path::new(entry);
        ensure!(
            path.components()
                .all(|part| matches!(part, Component::Normal(_)))
                && path.starts_with(root),
            "The manager archive contains an unsafe or unexpected path"
        );
        for (index, filename) in ["mactions", "libexec/gh", "manifest.json"]
            .iter()
            .enumerate()
        {
            if path == Path::new(root).join(filename) {
                required[index] = true;
            }
        }
    }
    ensure!(required.iter().all(|present| *present), "The release lacks mactions, bundled gh, or manifest.json; publish a complete current release first");
    ensure!(
        details
            .lines()
            .all(|line| matches!(line.as_bytes().first(), Some(b'-' | b'd'))),
        "Manager release archives must not contain symbolic links, hard links, or special files"
    );
    Ok(())
}

fn validate_bundle(bundle: &Path, version: &str, macos: u32) -> Result<()> {
    for filename in ["mactions", "libexec/gh", "manifest.json"] {
        ensure!(
            fs::symlink_metadata(bundle.join(filename))?
                .file_type()
                .is_file(),
            "Manager release asset is not a regular file: {filename}"
        );
    }
    let manifest: Manifest = serde_json::from_slice(&fs::read(bundle.join("manifest.json"))?)
        .context("The release has no valid compatibility manifest")?;
    ensure!(
        manifest.version == version && manifest.arch == "arm64" && manifest.min_macos >= 12,
        "The manager release manifest does not match this package"
    );
    ensure!(
        macos >= manifest.min_macos,
        "This release requires macOS {} or later",
        manifest.min_macos
    );
    let reported = checked(Command::new(bundle.join("mactions")).arg("--version"))?;
    ensure!(
        reported.trim() == format!("mactions {version}"),
        "The downloaded manager reports an unexpected version"
    );
    let gh = checked(Command::new(bundle.join("libexec/gh")).arg("--version"))?;
    ensure!(
        gh.starts_with("gh version "),
        "The bundled GitHub CLI failed its version check"
    );
    Ok(())
}

fn verify_cached_bundle(bundle: &Path, target: &Path) -> Result<()> {
    for filename in ["mactions", "libexec/gh", "manifest.json"] {
        ensure!(fs::symlink_metadata(target.join(filename))?.file_type().is_file() && checksum(&bundle.join(filename))? == checksum(&target.join(filename))?, "An existing release directory differs from the verified update; preserve it and resolve the conflict before retrying");
    }
    Ok(())
}

fn macos_major() -> Result<u32> {
    let version = checked(Command::new("/usr/bin/sw_vers").arg("-productVersion"))?;
    version
        .trim()
        .split('.')
        .next()
        .context("Could not identify macOS version")?
        .parse()
        .context("Invalid macOS version")
}

fn activate(
    directory: &Path,
    version: &str,
    mut restart: impl FnMut(&str) -> Result<()>,
) -> Result<()> {
    let directory = directory.canonicalize()?;
    let old_current = fs::read_link(directory.join("current"))
        .context("Managed installation has no current release link")?;
    let old_path = directory.join("current").canonicalize()?;
    ensure!(
        old_path.parent() == Some(directory.join("releases").as_path()),
        "Current manager release is outside this installation"
    );
    let old_version = old_path
        .file_name()
        .and_then(|name| name.to_str())
        .context("Invalid current manager version")?;
    version_parts(old_version)?;
    let old_previous = match fs::read_link(directory.join("previous")) {
        Ok(path) => Some(path),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(error.into()),
    };
    switch_link(&directory, "previous", &old_current)?;
    let result = switch_link(&directory, "current", &Path::new("releases").join(version))
        .and_then(|_| restart(version));
    if let Err(error) = result {
        switch_link(&directory, "current", &old_current)
            .context("Update failed and restoring the previous manager link also failed")?;
        match old_previous {
            Some(target) => switch_link(&directory, "previous", &target)?,
            None => fs::remove_file(directory.join("previous"))?,
        }
        restart(old_version).with_context(|| format!("Update failed ({error:#}); the previous manager was restored but could not restart"))?;
        bail!("Update failed; the previous manager was restored: {error:#}");
    }
    Ok(())
}

fn switch_link(directory: &Path, name: &str, target: &Path) -> Result<()> {
    let stage = tempfile::Builder::new()
        .prefix(".link-")
        .tempdir_in(directory)?;
    let link = stage.path().join(name);
    symlink(target, &link)?;
    fs::rename(link, directory.join(name))
        .context("Could not atomically activate the manager release")
}

fn wait_for_health(url: &str, version: &str, root: &Path) -> Result<()> {
    let root = root.canonicalize()?;
    let deadline = Instant::now() + Duration::from_secs(30);
    while Instant::now() < deadline {
        let result = checked(
            Command::new("/usr/bin/curl")
                .args([
                    "--fail",
                    "--silent",
                    "--show-error",
                    "--noproxy",
                    "*",
                    "--max-time",
                    "2",
                ])
                .arg(format!("{url}/api/manager/health")),
        );
        if let Ok(text) = result {
            if let Ok(value) = serde_json::from_str::<Value>(&text) {
                if value["version"] == version && value["data_dir"].as_str() == root.to_str() {
                    return Ok(());
                }
            }
        }
        thread::sleep(Duration::from_millis(250));
    }
    bail!("The restarted manager did not report the expected version and data directory")
}

fn checked(command: &mut Command) -> Result<String> {
    let output = command
        .output()
        .with_context(|| format!("Could not run {}", command.get_program().to_string_lossy()))?;
    ensure!(
        output.status.success(),
        "{} failed ({}): {}",
        command.get_program().to_string_lossy(),
        output.status,
        String::from_utf8_lossy(&output.stderr).trim()
    );
    String::from_utf8(output.stdout).context("Management command returned invalid text")
}

fn open_lock(root: &Path) -> Result<File> {
    OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(root.join("update.lock"))
        .context("Could not open the manager update lock")
}

fn save_status(root: &Path, state: &Value) -> Result<()> {
    let mut temporary = tempfile::NamedTempFile::new_in(root)?;
    serde_json::to_writer(temporary.as_file_mut(), state)?;
    temporary
        .persist(root.join("update.json"))
        .context("Could not save manager update status")?;
    Ok(())
}

#[cfg(test)]
#[path = "update_tests.rs"]
mod tests;
