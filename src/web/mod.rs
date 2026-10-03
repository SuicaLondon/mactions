//! Embedded frontend serving and the local HTTP API.
mod routes;

use crate::{core::Manager, github::Auth};
use anyhow::Result;
use routes::route;
use serde_json::json;
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

#[cfg(test)]
mod tests;
