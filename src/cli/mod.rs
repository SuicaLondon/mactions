use anyhow::{bail, Context, Result};
use mactions::{
    core::{Create, Manager},
    github,
    installation::{self, config, service, uninstall, update},
    native::{default_root, find_gh, Native},
    web,
};
use std::{
    io::{self, IsTerminal, Read, Write},
    path::PathBuf,
    sync::Arc,
};

const HELP: &str = r#"mactions — GitHub Actions runners on your Mac

Usage: mactions [--data-dir PATH] COMMAND

  open                          Start the dashboard if needed and open it
  service install | start | stop | restart | status
  update [--check]               Update the manager using its installation source
  uninstall                     Remove the manager; preserve runners and data
  create repo OWNER/REPO [--prefix NAME] [--labels a,b] [--registration-token TOKEN | --registration-token-stdin]
  create org ORGANIZATION [--prefix NAME] [--labels a,b] [--registration-token TOKEN | --registration-token-stdin]
  list [--local]                 Show runners; --local skips GitHub
  show ID                       Show one managed runner
  start ID | stop ID | restart ID
  labels ID a,b                  Replace custom labels (use '' to clear)
  delete ID --yes                Stop, deregister, then remove owned files
  retry ID [--registration-token TOKEN]  Resume incomplete creation
  serve [--bind ADDRESS:PORT]    Dashboard; saved network setting, local-only by default
  auth login | auth status      Use the host user's GitHub authentication
  help | --version

Stopping the dashboard does not stop runners.
LAN access has no login: reachable devices can manage your runners.
"#;

pub fn run() -> Result<()> {
    let mut args: Vec<_> = std::env::args().skip(1).collect();
    let mut root = default_root()?;
    if args.first().is_some_and(|s| s == "--data-dir") {
        if args.len() < 3 {
            bail!("--data-dir requires a path and command");
        }
        root = PathBuf::from(args.remove(1));
        args.remove(0);
    }
    let command = args.first().map(String::as_str).unwrap_or("help");
    if ["help", "--help", "-h"].contains(&command) {
        print!("{HELP}");
        return Ok(());
    }
    if command == "--version" {
        println!("mactions {}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }
    anyhow::ensure!(
        unsafe { libc::geteuid() } != 0,
        "Run mactions as your macOS login user, without sudo"
    );
    let gh = find_gh().unwrap_or_else(|_| PathBuf::from("gh"));
    if command == "auth" {
        let verb = args.get(1).map(String::as_str).unwrap_or("status");
        anyhow::ensure!(
            args.len() <= 2 && ["login", "status"].contains(&verb),
            "Use auth login or auth status"
        );
        let mut cmd = std::process::Command::new(gh);
        cmd.args(["auth", verb, "--hostname", "github.com"]);
        if verb == "login" {
            cmd.args(["--web", "--git-protocol", "https"]);
        }
        anyhow::ensure!(
            cmd.status()?.success(),
            "GitHub authentication command failed"
        );
        return Ok(());
    }
    std::fs::create_dir_all(&root)?;
    let root = root.canonicalize()?;
    let manager = Arc::new(Manager::new(root.clone(), Arc::new(Native { root, gh }))?);
    if let Some(output) = installation_command(command, &args, &manager.root)? {
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }
    let output = match command {
        "create" => {
            let kind = args
                .get(1)
                .cloned()
                .map(Ok)
                .unwrap_or_else(|| prompt("Target type (repo or org)", false))?;
            let supplied_target = args.get(2).filter(|s| !s.starts_with("--"));
            let target = supplied_target.cloned().map(Ok).unwrap_or_else(|| {
                prompt(
                    "GitHub URL or owner/repository (organization name for org)",
                    false,
                )
            })?;
            let mut prefix = "mactions".to_string();
            let mut labels = vec![];
            let mut registration_token = None;
            let mut i = if supplied_target.is_some() { 3 } else { 2 };
            while i < args.len() {
                if args[i] == "--registration-token-stdin" {
                    anyhow::ensure!(
                        registration_token.is_none(),
                        "Provide only one registration token input"
                    );
                    let mut token = String::new();
                    io::stdin().take(4097).read_to_string(&mut token)?;
                    registration_token = Some(token.trim().to_string());
                    i += 1;
                    continue;
                }
                let value = args.get(i + 1).context("Missing option value")?;
                match args[i].as_str() {
                    "--prefix" => prefix = value.clone(),
                    "--labels" => labels = split_labels(value),
                    "--registration-token" => {
                        anyhow::ensure!(
                            registration_token.is_none(),
                            "Provide only one registration token input"
                        );
                        registration_token = Some(value.clone());
                    }
                    _ => bail!("Unknown create option: {}", args[i]),
                }
                i += 2;
            }
            if registration_token.is_none() && github::connection(&manager)["connected"] != true {
                eprintln!("GitHub is not connected. A registration token can create this runner without gh login.");
                registration_token = Some(prompt("Registration token", true)?);
            }
            serde_json::to_value(manager.create(Create {
                kind,
                target,
                prefix,
                labels,
                registration_token,
            })?)?
        }
        "list" => {
            anyhow::ensure!(
                args.len() == 1 || args == ["list", "--local"],
                "Use list [--local]"
            );
            manager.list(args.len() == 1)?
        }
        "show" => {
            anyhow::ensure!(args.len() == 2, "Use show ID");
            serde_json::to_value(manager.get(args[1].parse()?)?)?
        }
        "serve" => {
            let bind = if args.len() == 1 {
                config::address(&manager.root)?
            } else {
                anyhow::ensure!(
                    args.len() == 3 && args[1] == "--bind",
                    "Use serve [--bind ADDRESS:PORT]"
                );
                args[2].clone()
            };
            return web::serve(manager, &bind);
        }
        "start" | "stop" | "restart" | "delete" | "retry" | "labels" => {
            let id = args.get(1).context("Specify a runner ID")?.parse()?;
            let labels = if command == "labels" {
                anyhow::ensure!(args.len() == 3, "Use labels ID a,b (or '' to clear)");
                split_labels(&args[2])
            } else {
                if command == "delete" {
                    anyhow::ensure!(args.len() == 3 && args[2] == "--yes", "Deleting removes the registration, workspace, and logs. Run delete ID --yes to proceed");
                } else if command == "retry" {
                    anyhow::ensure!(
                        args.len() == 2 || (args.len() == 4 && args[2] == "--registration-token"),
                        "Use retry ID [--registration-token TOKEN]"
                    );
                } else {
                    anyhow::ensure!(args.len() == 2, "Unexpected arguments");
                }
                vec![]
            };
            manager.action_with_token(
                id,
                command,
                &labels,
                if command == "retry" {
                    args.get(3).map(String::as_str)
                } else {
                    None
                },
            )?
        }
        _ => bail!("Unknown command: {command}. Run mactions help"),
    };
    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}
fn split_labels(text: &str) -> Vec<String> {
    if text.trim().is_empty() {
        vec![]
    } else {
        text.split(',').map(|s| s.trim().to_string()).collect()
    }
}

fn prompt(label: &str, secret: bool) -> Result<String> {
    anyhow::ensure!(io::stdin().is_terminal(), "{label} is required. Supply command arguments; registration tokens also accept --registration-token-stdin");
    eprint!("{label}: ");
    io::stderr().flush()?;
    struct EchoGuard(Option<libc::termios>);
    impl Drop for EchoGuard {
        fn drop(&mut self) {
            if let Some(settings) = self.0 {
                unsafe {
                    libc::tcsetattr(libc::STDIN_FILENO, libc::TCSANOW, &settings);
                }
            }
        }
    }
    let mut guard = EchoGuard(None);
    if secret {
        let mut settings = std::mem::MaybeUninit::<libc::termios>::uninit();
        anyhow::ensure!(
            unsafe { libc::tcgetattr(libc::STDIN_FILENO, settings.as_mut_ptr()) } == 0,
            "Cannot hide token input"
        );
        let original = unsafe { settings.assume_init() };
        let mut hidden = original;
        hidden.c_lflag &= !libc::ECHO;
        anyhow::ensure!(
            unsafe { libc::tcsetattr(libc::STDIN_FILENO, libc::TCSANOW, &hidden) } == 0,
            "Cannot hide token input"
        );
        guard.0 = Some(original);
    }
    let mut value = String::new();
    io::stdin().read_line(&mut value)?;
    drop(guard);
    if secret {
        eprintln!();
    }
    let value = value.trim().to_string();
    anyhow::ensure!(!value.is_empty(), "{label} is required");
    Ok(value)
}

fn installation_command(
    command: &str,
    args: &[String],
    root: &std::path::Path,
) -> Result<Option<serde_json::Value>> {
    let result = match command {
        "open" => {
            anyhow::ensure!(args.len() == 1, "Use mactions open");
            let _guard = installation::operation_guard(root)?;
            service::open(root)?
        }
        "service" => {
            anyhow::ensure!(
                args.len() == 2,
                "Use service install|start|stop|restart|status"
            );
            if args[1] == "status" {
                return Ok(Some(service::status(root)?));
            }
            let _guard = installation::operation_guard(root)?;
            match args[1].as_str() {
                "install" => service::install(root)?,
                "start" => service::start(root)?,
                "stop" => service::stop(root)?,
                "restart" => service::restart(root)?,
                _ => bail!("Use service install|start|stop|restart|status"),
            }
        }
        "update" => {
            if args.len() == 2 && args[1] == "--check" {
                return Ok(Some(update::check(root)?));
            }
            anyhow::ensure!(args.len() == 1, "Use update [--check]");
            update::run(root)?
        }
        "uninstall" => {
            anyhow::ensure!(args.len() == 1, "Use mactions uninstall");
            let _guard = installation::operation_guard(root)?;
            uninstall::run(root)?
        }
        "_update" => {
            anyhow::ensure!(args.len() == 1, "Invalid update helper arguments");
            std::thread::sleep(std::time::Duration::from_millis(500));
            update::run(root)?
        }
        "_service-restart" => {
            anyhow::ensure!(args.len() == 1, "Invalid service helper arguments");
            std::thread::sleep(std::time::Duration::from_millis(500));
            let started = std::time::Instant::now();
            let _guard = loop {
                match installation::operation_guard(root) {
                    Ok(guard) => break guard,
                    Err(error) => {
                        if started.elapsed() >= std::time::Duration::from_secs(300) {
                            return Err(error);
                        }
                        std::thread::sleep(std::time::Duration::from_millis(250));
                    }
                }
            };
            service::restart(root)?
        }
        _ => return Ok(None),
    };
    Ok(Some(result))
}
