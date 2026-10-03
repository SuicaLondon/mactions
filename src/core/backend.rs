use super::{Runner, Target};
use anyhow::{bail, Result};
use serde_json::Value;
use std::path::PathBuf;

pub trait Backend: Send + Sync {
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value>;
    fn job_logs(
        &self,
        _repository: &str,
        _job_id: u64,
        _step_index: Option<usize>,
    ) -> Result<String> {
        bail!("GitHub job log downloads are unavailable")
    }
    fn step_log_fallback(
        &self,
        _repository: &str,
        _job_id: u64,
        _run_attempt: u64,
    ) -> Result<String> {
        bail!("GitHub step log fallback is unavailable")
    }
    fn prepare(&self, runner: &Runner) -> Result<String>;
    fn configure(&self, runner: &Runner) -> Result<u64>;
    fn registration_token(&self, _target: &Target) -> Result<Option<String>> {
        Ok(None)
    }
    fn configure_with_token(&self, _runner: &Runner, _token: &str) -> Result<u64> {
        bail!("Registration token configuration is unavailable")
    }
    fn github_cli(&self) -> Option<PathBuf> {
        None
    }
    fn recover_registration(&self, runner: &Runner) -> Result<Option<u64>>;
    fn install_service(&self, runner: &Runner) -> Result<()>;
    fn start(&self, runner: &Runner) -> Result<()>;
    fn stop(&self, runner: &Runner) -> Result<()>;
    fn remove_service(&self, runner: &Runner) -> Result<()>;
    fn local_status(&self, runner: &Runner) -> Result<String>;
}
