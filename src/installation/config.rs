//! Persistent settings for the manager, independent of runner configuration.
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::Path};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(default, deny_unknown_fields)]
pub struct Settings {
    pub lan_access: bool,
}

pub fn load(root: &Path) -> Result<Settings> {
    let path = root.join("manager.json");
    match fs::read(&path) {
        Ok(bytes) => serde_json::from_slice(&bytes).context("Invalid manager settings"),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(error) => Err(error).context("Could not read manager settings"),
    }
}

pub fn save(root: &Path, settings: &Settings) -> Result<()> {
    fs::create_dir_all(root)?;
    let mut temporary = tempfile::NamedTempFile::new_in(root)?;
    serde_json::to_writer_pretty(temporary.as_file_mut(), settings)?;
    temporary.write_all(b"\n")?;
    temporary.as_file().sync_all()?;
    temporary.persist(root.join("manager.json"))?;
    fs::File::open(root)?.sync_all()?;
    Ok(())
}

pub fn address(root: &Path) -> Result<String> {
    if load(root)?.lan_access {
        return Ok("0.0.0.0:8787".into());
    }
    Ok("127.0.0.1:8787".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_settings_use_local_access_without_creating_a_file() {
        let directory = tempfile::tempdir().unwrap();
        assert_eq!(load(directory.path()).unwrap(), Settings::default());
        assert_eq!(address(directory.path()).unwrap(), "127.0.0.1:8787");
        assert!(!directory.path().join("manager.json").exists());
    }

    #[test]
    fn settings_persist_and_replace_an_existing_configuration() {
        let directory = tempfile::tempdir().unwrap();
        let settings = Settings { lan_access: true };
        save(directory.path(), &settings).unwrap();
        assert_eq!(load(directory.path()).unwrap(), settings);
        assert_eq!(address(directory.path()).unwrap(), "0.0.0.0:8787");
        save(directory.path(), &Settings::default()).unwrap();
        assert_eq!(address(directory.path()).unwrap(), "127.0.0.1:8787");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn malformed_settings_are_reported_instead_of_reset() {
        let directory = tempfile::tempdir().unwrap();
        fs::write(directory.path().join("manager.json"), b"not json").unwrap();
        assert!(load(directory.path()).is_err());
    }
}
