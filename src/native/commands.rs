//! Bounded subprocess capture and management-command timeouts.
use anyhow::{ensure, Context, Result};
use std::{
    io::{Read, Write},
    os::unix::process::CommandExt,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

pub(super) struct Output {
    pub(super) ok: bool,
    pub(super) text: String,
    pub(super) truncated: bool,
}

// Drain both pipes even after the retained output limit, avoiding deadlock and unbounded RAM.
fn read_limited(mut pipe: impl Read, limit: usize) -> std::io::Result<(Vec<u8>, bool)> {
    let mut retained = Vec::new();
    let mut truncated = false;
    let mut buffer = [0; 8192];
    loop {
        let n = pipe.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        let keep = n.min(limit.saturating_sub(retained.len()));
        truncated |= keep < n;
        retained.extend_from_slice(&buffer[..keep]);
    }
    Ok((retained, truncated))
}

pub(super) fn run(
    command: &mut Command,
    input: Option<&[u8]>,
    timeout: Duration,
) -> Result<Output> {
    run_with_limit(command, input, timeout, 2 * 1024 * 1024)
}

pub(super) fn run_with_limit(
    command: &mut Command,
    input: Option<&[u8]>,
    timeout: Duration,
    output_limit: usize,
) -> Result<Output> {
    command
        .stdin(if input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .process_group(0);
    let mut child = command.spawn().with_context(|| {
        format!(
            "Could not launch management command {}",
            command.get_program().to_string_lossy()
        )
    })?;
    let stdout = child.stdout.take().context("Missing stdout")?;
    let stderr = child.stderr.take().context("Missing stderr")?;
    let out = thread::spawn(move || read_limited(stdout, output_limit));
    let err = thread::spawn(move || read_limited(stderr, 2 * 1024 * 1024));
    if let Some(input) = input {
        let result = child
            .stdin
            .take()
            .context("Missing stdin")?
            .write_all(input);
        if result.is_err() {
            let _ = child.kill();
        }
    }
    let begin = Instant::now();
    let (status, timed_out) = loop {
        if let Some(status) = child.try_wait()? {
            break (status, false);
        }
        if begin.elapsed() > timeout {
            // This group contains only the transient management command, never a launchd service.
            unsafe {
                libc::kill(-(child.id() as i32), libc::SIGKILL);
            }
            break (child.wait()?, true);
        }
        thread::sleep(Duration::from_millis(50));
    };
    let (stdout, out_truncated) = out
        .join()
        .map_err(|_| anyhow::anyhow!("Output reader failed"))??;
    let (stderr, err_truncated) = err
        .join()
        .map_err(|_| anyhow::anyhow!("Error reader failed"))??;
    ensure!(
        !timed_out,
        "Management command timed out; inspect the saved runner state before retrying"
    );
    let mut text = String::from_utf8_lossy(&stdout).into_owned();
    if !status.success() {
        text.push_str(&String::from_utf8_lossy(&stderr));
    }
    Ok(Output {
        ok: status.success(),
        text,
        truncated: out_truncated || (!status.success() && err_truncated),
    })
}
pub(super) fn checked(command: &mut Command, timeout: u64) -> Result<String> {
    let output = run(command, None, Duration::from_secs(timeout))?;
    ensure!(output.ok, "{}", output.text.trim());
    Ok(output.text)
}
