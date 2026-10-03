//! Pollable GitHub CLI device login without exposing raw command output.
use crate::core::Manager;
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    os::unix::process::CommandExt,
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

#[derive(Clone)]
struct LoginState {
    generation: u64,
    status: String,
    code: Option<String>,
    pid: Option<i32>,
}
impl Default for LoginState {
    fn default() -> Self {
        Self {
            generation: 0,
            status: "idle".into(),
            code: None,
            pid: None,
        }
    }
}
#[derive(Default)]
pub struct Auth {
    state: Arc<Mutex<LoginState>>,
}
impl Auth {
    pub fn status(&self) -> Value {
        let state = self.state.lock().unwrap();
        json!({"status":state.status,"code":state.code,"url":"https://github.com/login/device"})
    }
    pub fn cancel(&self) -> Value {
        let mut state = self.state.lock().unwrap();
        if let Some(pid) = state.pid.take() {
            unsafe {
                libc::kill(-pid, libc::SIGKILL);
            }
        }
        state.generation += 1;
        state.status = "idle".into();
        state.code = None;
        drop(state);
        self.status()
    }
    pub fn start(&self, manager: &Manager, organization_scope: bool) -> Result<Value> {
        let path = manager
            .backend
            .github_cli()
            .context("GitHub CLI is unavailable. Use the complete release bundle.")?;
        ensure!(!["GH_TOKEN","GITHUB_TOKEN"].iter().any(|key| std::env::var(key).is_ok_and(|v| !v.is_empty())),"GitHub is configured through an environment token. Update that token on the host; browser login would not override it.");
        let mut state = self.state.lock().unwrap();
        if state.status == "pending" {
            drop(state);
            return Ok(self.status());
        }
        let mut command = Command::new(&path);
        command
            .args([
                "auth",
                "login",
                "--hostname",
                "github.com",
                "--web",
                "--git-protocol",
                "https",
            ])
            .env("GH_BROWSER", "/usr/bin/true")
            .env("GH_PROMPT_DISABLED", "1")
            .env("GH_PAGER", "cat")
            .env_remove("GH_DEBUG")
            .env_remove("DEBUG")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .process_group(0);
        if organization_scope {
            command.args(["--scopes", "admin:org"]);
        }
        let mut child = command
            .spawn()
            .with_context(|| format!("Could not start GitHub CLI login ({})", path.display()))?;
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(b"\n");
        }
        state.generation += 1;
        let generation = state.generation;
        state.status = "pending".into();
        state.code = None;
        state.pid = Some(child.id() as i32);
        for pipe in [
            child
                .stdout
                .take()
                .map(|p| Box::new(p) as Box<dyn Read + Send>),
            child
                .stderr
                .take()
                .map(|p| Box::new(p) as Box<dyn Read + Send>),
        ]
        .into_iter()
        .flatten()
        {
            let shared = self.state.clone();
            thread::spawn(move || capture_code(pipe, shared, generation));
        }
        let shared = self.state.clone();
        thread::spawn(move || {
            let started = Instant::now();
            loop {
                let current = shared.lock().unwrap().generation;
                if current != generation || started.elapsed() > Duration::from_secs(15 * 60) {
                    unsafe {
                        libc::kill(-(child.id() as i32), libc::SIGKILL);
                    }
                    let _ = child.wait();
                    let mut state = shared.lock().unwrap();
                    if state.generation == generation {
                        state.pid = None;
                        state.status = "expired".into();
                        state.code = None;
                    }
                    break;
                }
                match child.try_wait() {
                    Ok(Some(exit)) => {
                        let mut state = shared.lock().unwrap();
                        if state.generation == generation {
                            state.pid = None;
                            state.status =
                                if exit.success() { "complete" } else { "failed" }.into();
                            state.code = None;
                        }
                        break;
                    }
                    Err(_) => {
                        let _ = child.kill();
                        let _ = child.wait();
                        let mut state = shared.lock().unwrap();
                        if state.generation == generation {
                            state.pid = None;
                            state.status = "failed".into();
                            state.code = None;
                        }
                        break;
                    }
                    Ok(None) => thread::sleep(Duration::from_millis(200)),
                }
            }
        });
        drop(state);
        Ok(self.status())
    }
}
impl Drop for Auth {
    fn drop(&mut self) {
        self.cancel();
    }
}

fn device_code(text: &str) -> Option<String> {
    let marker = "one-time code:";
    let tail = text.split(marker).nth(1)?;
    tail.split_whitespace()
        .find(|part| {
            part.len() == 9
                && part.as_bytes()[4] == b'-'
                && part
                    .bytes()
                    .enumerate()
                    .all(|(i, b)| i == 4 || b.is_ascii_uppercase() || b.is_ascii_digit())
        })
        .map(str::to_string)
}
fn capture_code(mut pipe: Box<dyn Read + Send>, shared: Arc<Mutex<LoginState>>, generation: u64) {
    let mut retained = String::new();
    let mut buf = [0u8; 1024];
    while let Ok(n) = pipe.read(&mut buf) {
        if n == 0 {
            break;
        }
        retained.push_str(&String::from_utf8_lossy(&buf[..n]));
        if let Some(code) = device_code(&retained) {
            let mut state = shared.lock().unwrap();
            if state.generation == generation && state.status == "pending" {
                state.code = Some(code);
            }
        }
        if retained.len() > 8192 {
            retained = retained
                .chars()
                .rev()
                .take(4096)
                .collect::<String>()
                .chars()
                .rev()
                .collect();
        }
    }
}

#[cfg(test)]
#[path = "tests/auth.rs"]
mod tests;
