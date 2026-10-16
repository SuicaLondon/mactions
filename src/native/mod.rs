//! macOS adapter for GitHub CLI, runner installation, and launchd services.
mod api;
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
    api: api::Api,
}

impl Native {
    pub fn new(root: PathBuf, gh: PathBuf) -> Self {
        Self {
            root,
            gh,
            api: api::Api::new("https://api.github.com"),
        }
    }

    /// Sends REST requests to a loopback test server instead of GitHub.
    #[cfg(test)]
    pub(crate) fn with_api_base(root: PathBuf, gh: PathBuf, base: &str) -> Self {
        Self {
            root,
            gh,
            api: api::Api::without_proxy(base),
        }
    }
}

#[cfg(test)]
pub(crate) mod test_api;
#[cfg(test)]
mod tests;
