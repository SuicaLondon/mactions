//! macOS adapter for GitHub CLI, runner installation, and launchd services.
mod backend;
mod commands;
mod github;
mod paths;
mod service;

pub use paths::{default_root, find_gh};
use std::path::PathBuf;

pub struct Native {
    pub root: PathBuf,
    pub gh: PathBuf,
}

#[cfg(test)]
mod tests;
