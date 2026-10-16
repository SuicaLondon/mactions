//! Loopback GitHub REST fixture for tests of the native transport.
use std::thread;
use tiny_http::{Header, Response, Server};

pub(crate) struct Seen {
    pub method: String,
    pub path: String,
    pub authorization: String,
    pub api_version: String,
    pub body: String,
}

pub(crate) struct Reply {
    pub status: u16,
    pub headers: Vec<(&'static str, String)>,
    pub body: String,
}

impl Reply {
    pub fn json(body: impl ToString) -> Self {
        Self::status(200, body)
    }

    pub fn status(status: u16, body: impl ToString) -> Self {
        Self {
            status,
            headers: vec![],
            body: body.to_string(),
        }
    }

    pub fn header(mut self, name: &'static str, value: &str) -> Self {
        self.headers.push((name, value.into()));
        self
    }
}

/// Serves requests on an ephemeral loopback port until the test process exits.
pub(crate) fn serve(handler: impl Fn(&Seen) -> Reply + Send + 'static) -> String {
    let server = Server::http("127.0.0.1:0").unwrap();
    let port = server.server_addr().to_ip().unwrap().port();
    thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let header = |name: &str| {
                request
                    .headers()
                    .iter()
                    .find(|header| header.field.as_str().as_str().eq_ignore_ascii_case(name))
                    .map(|header| header.value.to_string())
                    .unwrap_or_default()
            };
            let mut seen = Seen {
                method: request.method().to_string(),
                path: request.url().into(),
                authorization: header("Authorization"),
                api_version: header("X-GitHub-Api-Version"),
                body: String::new(),
            };
            request.as_reader().read_to_string(&mut seen.body).unwrap();
            let reply = handler(&seen);
            let mut response = Response::from_string(reply.body).with_status_code(reply.status);
            for (name, value) in reply.headers {
                response.add_header(Header::from_bytes(name, value).unwrap());
            }
            let _ = request.respond(response);
        }
    });
    format!("http://127.0.0.1:{port}")
}
