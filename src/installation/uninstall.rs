//! Remove only files owned by the manager installer; preserve all runner data.
use super::service::{self, InstallSource};
use anyhow::{ensure, Context, Result};
use fs2::FileExt;
use serde_json::{json, Value};
use std::{
    fs::{self, OpenOptions},
    os::unix::fs::{MetadataExt, OpenOptionsExt},
    path::Path,
    process::Command,
};

pub fn run(root: &Path) -> Result<Value> {
    let source = service::source()?;
    let home = std::path::PathBuf::from(std::env::var_os("HOME").context("HOME is not set")?);
    match &source {
        InstallSource::Script { directory } => {
            ensure!(
                directory == &home.join(".local/share/mactions"),
                "Unexpected manager installation directory"
            );
            let metadata = fs::symlink_metadata(directory)?;
            // Reading the effective account ID does not change process credentials.
            ensure!(
                metadata.is_dir() && metadata.uid() == unsafe { libc::geteuid() },
                "Manager installation must be a directory owned by the current account"
            );
            let marker_metadata = fs::symlink_metadata(directory.join("install.json"))?;
            ensure!(
                marker_metadata.is_file() && marker_metadata.uid() == metadata.uid(),
                "Manager installer ownership marker must be an owned regular file"
            );
            let marker: Value = serde_json::from_slice(
                &fs::read(directory.join("install.json"))
                    .context("Manager installer ownership marker is missing")?,
            )?;
            ensure!(
                marker["schema"] == 1 && marker["source"] == "script",
                "Invalid manager installer ownership marker"
            );
            ensure!(
                !root.canonicalize()?.starts_with(directory.canonicalize()?),
                "Runner data is inside the manager installation. Move it before uninstalling"
            );
            let update_lock = OpenOptions::new()
                .create(true)
                .truncate(false)
                .read(true)
                .write(true)
                .mode(0o600)
                .open(directory.join("update.lock"))?;
            update_lock
                .try_lock_exclusive()
                .context("A manager update is running; retry uninstall after it finishes")?;
            service::remove(root)?;
            remove_wrapper(
                &home.join(".local/bin/mactions"),
                &directory.join("current/mactions"),
            )?;
            for name in [".zshrc", ".bash_profile"] {
                remove_path_block(&home.join(name))?;
            }
            fs::remove_dir_all(directory).context("Could not remove the manager installation")?;
        }
        InstallSource::Homebrew { brew, .. } => {
            service::stop(root)?;
            ensure!(
                Command::new(brew)
                    .args(["uninstall", "mactions"])
                    .status()?
                    .success(),
                "Homebrew uninstall failed; retry brew uninstall mactions"
            );
        }
        InstallSource::Manual { .. } => {
            service::remove(root)?;
            return Ok(
                json!({"removed":false,"message":"The dashboard service was removed. Remove this manually extracted bundle yourself. Runners and data are preserved."}),
            );
        }
    }
    Ok(
        json!({"removed":true,"message":"mactions was uninstalled. Runners, GitHub credentials, and data are preserved."}),
    )
}

fn remove_wrapper(path: &Path, target: &Path) -> Result<()> {
    if fs::read_link(path).ok().as_deref() == Some(target) {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn remove_path_block(path: &Path) -> Result<()> {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    if let Some(updated) = without_path_block(&contents) {
        let resolved = path.canonicalize()?;
        let metadata = fs::metadata(&resolved)?;
        let mut temporary = tempfile::NamedTempFile::new_in(
            resolved
                .parent()
                .context("Shell configuration has no parent")?,
        )?;
        use std::io::Write;
        temporary.write_all(updated.as_bytes())?;
        temporary
            .as_file()
            .set_permissions(metadata.permissions())?;
        temporary.as_file().sync_all()?;
        temporary.persist(resolved)?;
    }
    Ok(())
}

fn without_path_block(contents: &str) -> Option<String> {
    let begin = "# >>> mactions PATH >>>";
    let end = "# <<< mactions PATH <<<";
    let lines: Vec<_> = contents.split_inclusive('\n').collect();
    let mut result = String::new();
    let mut changed = false;
    let mut index = 0;
    while index < lines.len() {
        if lines[index].trim_end() == begin {
            if let Some(offset) = lines[index + 1..]
                .iter()
                .position(|line| line.trim_end() == end)
            {
                index += offset + 2;
                changed = true;
                continue;
            }
        }
        result.push_str(lines[index]);
        index += 1;
    }
    if changed {
        return Some(result);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_unrelated_shell_configuration_and_incomplete_markers() {
        let input = "export CUSTOM=yes\n# >>> mactions PATH >>>\nexport PATH=example\n# <<< mactions PATH <<<\nalias ll=ls\n";
        assert_eq!(
            without_path_block(input).unwrap(),
            "export CUSTOM=yes\nalias ll=ls\n"
        );
        assert!(without_path_block("# >>> mactions PATH >>>\nexport CUSTOM=yes\n").is_none());
    }

    #[test]
    fn removes_only_the_installer_owned_wrapper() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("mactions");
        let own = temp.path().join("current/mactions");
        fs::write(&path, "unrelated command").unwrap();
        remove_wrapper(&path, &own).unwrap();
        assert!(path.exists());
        fs::remove_file(&path).unwrap();
        std::os::unix::fs::symlink(&own, &path).unwrap();
        remove_wrapper(&path, &own).unwrap();
        assert!(fs::symlink_metadata(path).is_err());
    }

    #[test]
    fn cleans_shell_settings_without_replacing_an_existing_symlink() {
        let temp = tempfile::tempdir().unwrap();
        let target = temp.path().join("shared.rc");
        let alias = temp.path().join(".zshrc");
        fs::write(
            &target,
            "alias ll=ls\n# >>> mactions PATH >>>\nexport PATH=example\n# <<< mactions PATH <<<\n",
        )
        .unwrap();
        std::os::unix::fs::symlink(&target, &alias).unwrap();
        remove_path_block(&alias).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "alias ll=ls\n");
        assert_eq!(fs::read_link(alias).unwrap(), target);
    }
}
