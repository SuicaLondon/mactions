//! Locate host tools and preserve the existing data-directory convention.
use anyhow::{bail, Context, Result};
use std::path::PathBuf;

pub fn find_gh() -> Result<PathBuf> {
    let exe = std::env::current_exe()?;
    if let Some(dir) = exe.parent() {
        let bundled = dir.join("libexec/gh");
        if bundled.is_file() {
            return Ok(bundled);
        }
    }
    for dir in std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default()) {
        let path = dir.join("gh");
        if path.is_file() {
            return Ok(path);
        }
    }
    // GUI-launched processes may not inherit the user's Homebrew PATH.
    for executable in ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"] {
        let path = PathBuf::from(executable);
        if path.is_file() {
            return Ok(path);
        }
    }
    bail!("GitHub CLI is missing. Install gh or use the complete mactions release bundle, which includes gh")
}

pub fn default_root() -> Result<PathBuf> {
    let home = PathBuf::from(std::env::var_os("HOME").context("HOME is not set")?);
    let root = home.join(".mactions");
    let legacy = home.join("Library/Application Support/mactions");
    // Keep existing installations manageable until their services are migrated.
    if !root.exists() && legacy.join("records").is_dir() {
        return Ok(legacy);
    }
    Ok(root)
}
