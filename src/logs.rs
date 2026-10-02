use crate::core::Manager;
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::{
    ffi::CString,
    fs::{self, File, OpenOptions},
    io::{Read, Seek, SeekFrom},
    os::{
        fd::{AsRawFd, FromRawFd},
        unix::fs::OpenOptionsExt,
    },
    path::Path,
};

const TAIL_BYTES: u64 = 64 * 1024;

fn allowed(name: &str) -> bool {
    if name == "logs/stdout.log" || name == "logs/stderr.log" {
        return true;
    }
    let Some(file) = name.strip_prefix("_diag/") else {
        return false;
    };
    file.len() < 160
        && !file.contains("..")
        && file.ends_with(".log")
        && (file.starts_with("Runner_") || file.starts_with("Worker_"))
        && file
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
}

fn open_directory(path: &Path) -> Result<File> {
    Ok(OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW)
        .open(path)?)
}
fn open_at(parent: &File, name: &str, directory: bool) -> Result<File> {
    let name = CString::new(name)?;
    let flags = libc::O_RDONLY
        | libc::O_NOFOLLOW
        | libc::O_NONBLOCK
        | libc::O_CLOEXEC
        | if directory { libc::O_DIRECTORY } else { 0 };
    let fd = unsafe { libc::openat(parent.as_raw_fd(), name.as_ptr(), flags) };
    ensure!(
        fd >= 0,
        "Log file is unavailable or is not a regular local file"
    );
    Ok(unsafe { File::from_raw_fd(fd) })
}

pub fn read(manager: &Manager, id: u64, selection: Option<&str>) -> Result<Value> {
    let runner = manager.get(id)?;
    let base = open_directory(&runner.path)?;
    let mut files = vec![];
    for directory in ["_diag", "logs"] {
        let Ok(dir) = open_at(&base, directory, true) else {
            continue;
        };
        for entry in fs::read_dir(runner.path.join(directory))? {
            let entry = entry?;
            let file = entry.file_name().to_string_lossy().into_owned();
            let name = format!("{directory}/{file}");
            if !allowed(&name) {
                continue;
            }
            let Ok(handle) = open_at(&dir, &file, false) else {
                continue;
            };
            let meta = handle.metadata()?;
            if !meta.is_file() {
                continue;
            }
            let modified = meta
                .modified()?
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            files.push(json!({"name":name, "bytes":meta.len(), "modified":modified}));
        }
    }
    files.sort_by(|a, b| {
        b["modified"]
            .as_u64()
            .cmp(&a["modified"].as_u64())
            .then_with(|| b["name"].as_str().cmp(&a["name"].as_str()))
    });
    // Only enumerate existing files; never archive or persist log content.
    let default = files
        .iter()
        .find(|f| {
            f["name"]
                .as_str()
                .is_some_and(|n| n.starts_with("_diag/Runner_"))
        })
        .or_else(|| files.first())
        .and_then(|f| f["name"].as_str());
    let selected = selection.filter(|s| !s.is_empty()).or(default);
    let mut content = String::new();
    let mut total = 0;
    if let Some(name) = selected {
        ensure!(allowed(name), "Choose a runner diagnostic or service log");
        let (directory, file) = name.split_once('/').context("Invalid log name")?;
        let dir = open_at(&base, directory, true)?;
        let mut file = open_at(&dir, file, false)?;
        ensure!(file.metadata()?.is_file(), "Logs must be regular files");
        total = file.metadata()?.len();
        file.seek(SeekFrom::Start(total.saturating_sub(TAIL_BYTES)))?;
        let mut bytes = vec![];
        file.take(TAIL_BYTES).read_to_end(&mut bytes)?;
        content = String::from_utf8_lossy(&bytes).into_owned();
    }
    Ok(
        json!({"files":files, "selected":selected, "content":content, "truncated":total > TAIL_BYTES, "total_bytes":total}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        core::{Runner, Target},
        native::Native,
    };
    use std::sync::Arc;
    #[test]
    fn tails_existing_logs_and_rejects_secrets_symlinks_and_traversal() {
        let temp = tempfile::tempdir().unwrap();
        let manager = Manager::new(
            temp.path().into(),
            Arc::new(Native {
                root: temp.path().into(),
                gh: "/missing".into(),
            }),
        )
        .unwrap();
        let path = manager.root.join("actions-runner-1");
        fs::create_dir_all(path.join("_diag")).unwrap();
        manager
            .save(&Runner {
                id: 1,
                name: "test-1".into(),
                target: Target::new("repo", "a/b").unwrap(),
                labels: vec![],
                path: path.clone(),
                version: None,
                github_id: Some(2),
                enabled: false,
                phase: "ready".into(),
                error: None,
                deregistered: false,
                registration_attempted: true,
            })
            .unwrap();
        fs::write(path.join("_diag/Runner_1.log"), vec![b'x'; 100_000]).unwrap();
        let data = read(&manager, 1, None).unwrap();
        assert_eq!(data["content"].as_str().unwrap().len(), TAIL_BYTES as usize);
        assert_eq!(data["truncated"], true);
        for name in [
            "../secret",
            ".credentials",
            "_diag/../secret",
            "_diag/pages/file.log",
        ] {
            assert!(read(&manager, 1, Some(name)).is_err());
        }
        fs::write(temp.path().join("secret"), "secret").unwrap();
        std::os::unix::fs::symlink(temp.path().join("secret"), path.join("_diag/Worker_2.log"))
            .unwrap();
        assert!(read(&manager, 1, Some("_diag/Worker_2.log")).is_err());
        std::os::unix::fs::symlink(temp.path(), path.join("logs")).unwrap();
        assert!(read(&manager, 1, Some("logs/stdout.log")).is_err());
    }
}
