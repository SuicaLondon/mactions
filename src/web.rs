use crate::{
    core::{Create, Manager, Target},
    github::{self, Auth},
    logs,
};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use std::{
    io::Read,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

include!(concat!(env!("OUT_DIR"), "/web_assets.rs"));
static SHUTDOWN: AtomicBool = AtomicBool::new(false);
extern "C" fn shutdown_signal(_: libc::c_int) {
    SHUTDOWN.store(true, Ordering::SeqCst);
}

pub fn serve(manager: Arc<Manager>, address: &str) -> Result<()> {
    let server = Arc::new(
        Server::http(address).map_err(|e| anyhow::anyhow!("Could not listen on {address}: {e}"))?,
    );
    SHUTDOWN.store(false, Ordering::SeqCst);
    // The signal handler only sets a lock-free flag. Workers finish their current operation.
    unsafe {
        libc::signal(
            libc::SIGINT,
            shutdown_signal as *const () as libc::sighandler_t,
        );
        libc::signal(
            libc::SIGTERM,
            shutdown_signal as *const () as libc::sighandler_t,
        );
    }
    println!("mactions is listening on http://{}\nOpen http://localhost:8787 when using the default port.\nThere is no application login. Press Ctrl-C to stop the web server; runners stay running.", server.server_addr());
    let auth = Arc::new(Auth::default());
    let mut workers = vec![];
    for _ in 0..4 {
        let server = server.clone();
        let manager = manager.clone();
        let auth = auth.clone();
        workers.push(thread::spawn(move || {
            while !SHUTDOWN.load(Ordering::SeqCst) {
                match server.recv_timeout(Duration::from_millis(250)) {
                    Ok(Some(request)) => handle(request, &manager, &auth),
                    Ok(None) => (),
                    Err(_) => break,
                }
            }
        }));
    }
    for worker in workers {
        let _ = worker.join();
    }
    Ok(())
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name, value).expect("Static HTTP header")
}

fn handle(mut request: Request, manager: &Manager, auth: &Auth) {
    if request.method() == &Method::Get {
        let path = request.url().split('?').next().unwrap_or("/");
        let path = if path == "/" { "/index.html" } else { path };
        if let Some((_, content_type, bytes)) = ASSETS.iter().find(|asset| asset.0 == path) {
            // Borrow embedded assets instead of allocating a fresh JS/CSS buffer per request.
            let response = Response::new(
                StatusCode(200),
                vec![],
                std::io::Cursor::new(*bytes),
                Some(bytes.len()),
                None,
            );
            respond(request, response, content_type);
            return;
        }
    }
    let result = route(&mut request, manager, auth);
    let (status, content_type, body) = match result {
        Ok(response) => response,
        Err(error) => {
            let message = format!("{error:#}");
            let status = if message.contains("Another management operation") {
                409
            } else {
                400
            };
            (
                status,
                "application/json; charset=utf-8",
                json!({"error": message}).to_string(),
            )
        }
    };
    let response = Response::from_string(body).with_status_code(StatusCode(status));
    respond(request, response, content_type);
}

fn respond<R: Read>(request: Request, response: Response<R>, content_type: &str) {
    let response = response
        .with_header(header("Content-Type", content_type))
        .with_header(header("Cache-Control", "no-store"))
        .with_header(header("X-Content-Type-Options", "nosniff"))
        .with_header(header("Referrer-Policy", "no-referrer"))
        .with_header(header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"));
    let _ = request.respond(response);
}

fn route(
    request: &mut Request,
    manager: &Manager,
    auth: &Auth,
) -> Result<(u16, &'static str, String)> {
    let url = request.url().to_string();
    let (path, query) = url.split_once('?').unwrap_or((&url, ""));
    let params = query_params(query)?;
    let param = |name: &str| {
        params
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.as_str())
    };
    if request.method() == &Method::Get {
        let result = match path {
            "/api/runners" => manager.list(param("local") != Some("1"))?,
            "/api/github/connection" => github::connection(manager),
            "/api/github/auth" => auth.status(),
            "/api/github/targets" => github::targets(
                manager,
                param("kind").unwrap_or("repo"),
                param("page").unwrap_or("1").parse()?,
            )?,
            _ => {
                let parts: Vec<_> = path.trim_start_matches('/').split('/').collect();
                if parts.len() != 4 || parts[0] != "api" || parts[1] != "runners" {
                    return Ok((
                        404,
                        "application/json",
                        json!({"error":"Not found"}).to_string(),
                    ));
                }
                let id = parts[2].parse()?;
                match parts[3] {
                    "logs" => logs::read(manager, id, param("file"))?,
                    "jobs" => github::jobs(manager, id, param("repository"))?,
                    "job-logs" => github::job_logs(
                        manager,
                        id,
                        param("repository"),
                        param("job_id").context("Choose a job")?.parse()?,
                        param("step_number").map(str::parse).transpose()?,
                    )?,
                    "capabilities" => github::capabilities(manager, &manager.get(id)?.target),
                    _ => {
                        return Ok((
                            404,
                            "application/json",
                            json!({"error":"Not found"}).to_string(),
                        ))
                    }
                }
            }
        };
        return Ok((200, "application/json; charset=utf-8", result.to_string()));
    }
    ensure!(request.method() == &Method::Post, "Unsupported HTTP method");
    // LAN callers intentionally need no credentials. This header prevents unrelated websites
    // from submitting cross-origin forms using the Mac's GitHub identity.
    ensure!(
        request
            .headers()
            .iter()
            .any(|h| h.field.equiv("X-Mactions") && h.value.as_str() == "1"),
        "Missing X-Mactions request header"
    );
    ensure!(
        request
            .headers()
            .iter()
            .any(|h| h.field.equiv("Content-Type")
                && h.value.as_str().starts_with("application/json")),
        "Expected application/json"
    );
    if let Some(origin) = request.headers().iter().find(|h| h.field.equiv("Origin")) {
        let host = request
            .headers()
            .iter()
            .find(|h| h.field.equiv("Host"))
            .context("Missing Host header")?
            .value
            .as_str();
        ensure!(
            [format!("http://{host}"), format!("https://{host}")]
                .contains(&origin.value.as_str().to_string()),
            "Cross-origin requests are not allowed"
        );
    }
    ensure!(
        request.body_length().unwrap_or(0) <= 16384,
        "Request body is too large"
    );
    let mut bytes = vec![];
    request.as_reader().take(16385).read_to_end(&mut bytes)?;
    ensure!(bytes.len() <= 16384, "Request body is too large");
    let payload: Value = serde_json::from_slice(&bytes)?;
    let result = if path == "/api/github/auth" {
        auth.start(
            manager,
            payload["organization_scope"].as_bool().unwrap_or(false),
        )?
    } else if path == "/api/github/auth/cancel" {
        auth.cancel()
    } else if path == "/api/github/check" {
        let target = Target::new(
            payload["kind"].as_str().context("Choose a target type")?,
            payload["target"].as_str().context("Choose a target")?,
        )?;
        github::capabilities(manager, &target)
    } else if path == "/api/runners" {
        let request: Create = serde_json::from_slice(&bytes)?;
        serde_json::to_value(manager.create(request)?)?
    } else {
        let parts: Vec<_> = path.trim_start_matches('/').split('/').collect();
        ensure!(
            parts.len() == 4 && parts[0] == "api" && parts[1] == "runners",
            "Unknown route"
        );
        let id = parts[2].parse::<u64>()?;
        let payload: Value = serde_json::from_slice(&bytes)?;
        if parts[3] == "delete" {
            ensure!(
                payload["confirm"].as_bool() == Some(true),
                "Deletion requires confirmation"
            );
        }
        let labels = if parts[3] == "labels" {
            serde_json::from_value(payload["labels"].clone())?
        } else {
            vec![]
        };
        manager.action_with_token(
            id,
            parts[3],
            &labels,
            payload["registration_token"].as_str(),
        )?
    };
    Ok((200, "application/json; charset=utf-8", result.to_string()))
}

fn query_params(query: &str) -> Result<Vec<(String, String)>> {
    fn decode(text: &str) -> Result<String> {
        let mut out = vec![];
        let mut chars = text.bytes();
        while let Some(b) = chars.next() {
            if b == b'%' {
                let a = chars.next().context("Invalid URL encoding")?;
                let b = chars.next().context("Invalid URL encoding")?;
                out.push(
                    ((a as char).to_digit(16).context("Invalid URL encoding")? * 16
                        + (b as char).to_digit(16).context("Invalid URL encoding")?)
                        as u8,
                );
            } else {
                out.push(if b == b'+' { b' ' } else { b });
            }
        }
        Ok(String::from_utf8(out)?)
    }
    query
        .split('&')
        .filter(|s| !s.is_empty())
        .map(|s| {
            let (k, v) = s.split_once('=').unwrap_or((s, ""));
            Ok((decode(k)?, decode(v)?))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::native::Native;
    use tiny_http::TestRequest;
    fn manager() -> (tempfile::TempDir, Manager) {
        let temp = tempfile::tempdir().unwrap();
        let native = Native {
            root: temp.path().into(),
            gh: "/does-not-exist".into(),
        };
        let manager = Manager::new(temp.path().into(), Arc::new(native)).unwrap();
        (temp, manager)
    }
    #[test]
    fn rejects_cross_origin_mutations_before_touching_runner_state() {
        let (_temp, manager) = manager();
        let mut request = TestRequest::new()
            .with_method(Method::Post)
            .with_path("/api/runners/1/delete")
            .with_body("{\"confirm\":true}")
            .with_header(header("Content-Type", "application/json"))
            .with_header(header("X-Mactions", "1"))
            .with_header(header("Host", "localhost:8787"))
            .with_header(header("Origin", "https://unrelated.example"))
            .into();
        assert!(route(&mut request, &manager, &Auth::default())
            .unwrap_err()
            .to_string()
            .contains("Cross-origin"));
    }
    #[test]
    fn rejects_form_posts_and_unconfirmed_deletions() {
        let (_temp, manager) = manager();
        let mut form = TestRequest::new()
            .with_method(Method::Post)
            .with_path("/api/runners")
            .with_body("{}")
            .into();
        assert!(route(&mut form, &manager, &Auth::default())
            .unwrap_err()
            .to_string()
            .contains("X-Mactions"));
        let mut deletion = TestRequest::new()
            .with_method(Method::Post)
            .with_path("/api/runners/1/delete")
            .with_body("{}")
            .with_header(header("Content-Type", "application/json"))
            .with_header(header("X-Mactions", "1"))
            .into();
        assert!(route(&mut deletion, &manager, &Auth::default())
            .unwrap_err()
            .to_string()
            .contains("confirmation"));
    }
}
