//! Installation, dashboard services, and host-level settings.
pub mod config;
pub mod service;
pub mod uninstall;
pub mod update;

use anyhow::{Context, Result};
use fs2::FileExt;
use std::{
    fs::{File, OpenOptions},
    path::Path,
};

pub fn operation_guard(root: &Path) -> Result<File> {
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(root.join("manager.lock"))?;
    file.try_lock_exclusive()
        .context("Another management operation is running. Wait for it to finish and retry")?;
    Ok(file)
}
