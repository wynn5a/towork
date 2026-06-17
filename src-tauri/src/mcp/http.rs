use serde_json::{json, Value};
use tiny_http::{Header, Method, Response, Server};

use crate::db;
use crate::mcp::server::{handle_message, is_mutating};

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("valid header")
}

fn cors() -> Vec<Header> {
    vec![
        header("Access-Control-Allow-Origin", "*"),
        header("Access-Control-Allow-Methods", "POST, GET, OPTIONS"),
        header("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id, Authorization"),
    ]
}

fn respond_json(request: tiny_http::Request, status: u16, body: String) {
    let mut headers = cors();
    headers.push(header("Content-Type", "application/json"));
    let mut resp = Response::from_string(body).with_status_code(status);
    for h in headers {
        resp.add_header(h);
    }
    let _ = request.respond(resp);
}

/// Run the MCP server over HTTP (a single JSON-RPC endpoint) until the process
/// exits. Opens its own connection to the shared database. `notify` is invoked
/// after any state-mutating tool call so the UI can refresh.
///
/// This is the Streamable-HTTP-style transport: clients POST a JSON-RPC message
/// and receive the JSON-RPC response. Blocks the calling thread.
pub fn serve<F: Fn() + Send + 'static>(addr: String, notify: F) -> anyhow::Result<()> {
    let db_path = db::default_db_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = db::init_db(&db_path)?;

    let server = Server::http(&addr).map_err(|e| anyhow::anyhow!("MCP HTTP bind {addr} failed: {e}"))?;
    eprintln!("[towork-mcp] http listening on http://{addr}/  · db={}", db_path.display());

    for mut request in server.incoming_requests() {
        match request.method() {
            Method::Options => {
                let mut resp = Response::empty(204);
                for h in cors() {
                    resp.add_header(h);
                }
                let _ = request.respond(resp);
                continue;
            }
            Method::Get => {
                // Simple health endpoint (no SSE stream in this MVP transport).
                respond_json(
                    request,
                    200,
                    json!({ "server": "towork", "transport": "http", "status": "ok" }).to_string(),
                );
                continue;
            }
            Method::Post => {}
            _ => {
                respond_json(request, 405, json!({ "error": "method not allowed" }).to_string());
                continue;
            }
        }

        let mut body = String::new();
        if request.as_reader().read_to_string(&mut body).is_err() {
            respond_json(request, 400, error_body("could not read request body"));
            continue;
        }

        let req: Value = match serde_json::from_str(&body) {
            Ok(v) => v,
            Err(e) => {
                respond_json(request, 400, error_body(&format!("parse error: {e}")));
                continue;
            }
        };

        let mutating = is_mutating(&req);
        let response = handle_message(&conn, &req);
        if mutating {
            notify();
        }

        match response {
            Some(resp) => respond_json(request, 200, resp.to_string()),
            // Notification: nothing to return.
            None => {
                let mut empty = Response::empty(202);
                for h in cors() {
                    empty.add_header(h);
                }
                let _ = request.respond(empty);
            }
        }
    }
    Ok(())
}

fn error_body(message: &str) -> String {
    json!({ "jsonrpc": "2.0", "id": null, "error": { "code": -32700, "message": message } }).to_string()
}
