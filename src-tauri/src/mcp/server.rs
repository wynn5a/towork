use std::io::{BufRead, Write};

use rusqlite::Connection;
use serde_json::{json, Value};

use crate::db;
use crate::mcp::{prompts, resources, tools};

const PROTOCOL_VERSION: &str = "2024-11-05";

/// Run the MCP server over stdio. Blocks, reading newline-delimited JSON-RPC
/// messages from stdin and writing responses to stdout. Diagnostics go to
/// stderr so they never corrupt the protocol stream.
pub fn run_stdio() -> anyhow::Result<()> {
    let db_path = db::default_db_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = db::init_db(&db_path)?;
    eprintln!("[towork-mcp] ready · db={}", db_path.display());

    let stdin = std::io::stdin();
    let stdout = std::io::stdout();
    let mut out = stdout.lock();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let req: Value = match serde_json::from_str(trimmed) {
            Ok(v) => v,
            Err(e) => {
                write_message(&mut out, &error_response(Value::Null, -32700, &format!("Parse error: {e}")))?;
                continue;
            }
        };
        if let Some(resp) = handle_message(&conn, &req) {
            write_message(&mut out, &resp)?;
        }
    }
    Ok(())
}

/// Handle one parsed JSON-RPC message against `conn`. Returns the response to
/// send, or `None` for notifications (which never get a response). Shared by the
/// stdio and HTTP transports.
pub fn handle_message(conn: &Connection, req: &Value) -> Option<Value> {
    let id = req.get("id").cloned();
    let method = req.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let params = req.get("params").cloned().unwrap_or(json!({}));
    let is_notification = id.is_none();

    match dispatch(conn, method, params) {
        Ok(Some(result)) if !is_notification => Some(success_response(id.unwrap_or(Value::Null), result)),
        Err(err) if !is_notification => Some(error_response(id.unwrap_or(Value::Null), err.code, &err.message)),
        _ => None,
    }
}

/// Whether a JSON-RPC message is a tool call that mutates state (used by the
/// HTTP transport to notify the UI to refresh).
pub fn is_mutating(req: &Value) -> bool {
    if req.get("method").and_then(|m| m.as_str()) != Some("tools/call") {
        return false;
    }
    matches!(
        req.pointer("/params/name").and_then(|v| v.as_str()),
        Some("create_item") | Some("update_item") | Some("complete_item") | Some("delete_item")
    )
}

struct RpcError {
    code: i64,
    message: String,
}
fn rpc_err(code: i64, message: impl Into<String>) -> RpcError {
    RpcError { code, message: message.into() }
}

/// Returns `Ok(Some(result))` for request methods, `Ok(None)` for notifications.
fn dispatch(conn: &Connection, method: &str, params: Value) -> Result<Option<Value>, RpcError> {
    match method {
        "initialize" => Ok(Some(json!({
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {}
            },
            "serverInfo": { "name": "towork", "version": env!("CARGO_PKG_VERSION") }
        }))),
        "ping" => Ok(Some(json!({}))),
        // Lifecycle notifications — acknowledge silently.
        "notifications/initialized" | "initialized" | "notifications/cancelled" => Ok(None),

        "tools/list" => Ok(Some(json!({ "tools": tools::list_tools() }))),
        "tools/call" => {
            let name = params.get("name").and_then(|v| v.as_str())
                .ok_or_else(|| rpc_err(-32602, "missing tool name"))?;
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            let result = tools::call_tool(conn, name, args)
                .map_err(|e| rpc_err(-32603, e))?;
            Ok(Some(result))
        }

        "resources/list" => Ok(Some(json!({ "resources": resources::list_resources() }))),
        "resources/read" => {
            let uri = params.get("uri").and_then(|v| v.as_str())
                .ok_or_else(|| rpc_err(-32602, "missing resource uri"))?;
            let contents = resources::read_resource(conn, uri).map_err(|e| rpc_err(-32603, e))?;
            Ok(Some(json!({ "contents": contents })))
        }

        "prompts/list" => Ok(Some(json!({ "prompts": prompts::list_prompts() }))),
        "prompts/get" => {
            let name = params.get("name").and_then(|v| v.as_str())
                .ok_or_else(|| rpc_err(-32602, "missing prompt name"))?;
            let result = prompts::get_prompt(conn, name).map_err(|e| rpc_err(-32603, e))?;
            Ok(Some(result))
        }

        other => Err(rpc_err(-32601, format!("Method not found: {other}"))),
    }
}

fn success_response(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}
fn error_response(id: Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

fn write_message(out: &mut impl Write, msg: &Value) -> anyhow::Result<()> {
    let s = serde_json::to_string(msg)?;
    out.write_all(s.as_bytes())?;
    out.write_all(b"\n")?;
    out.flush()?;
    Ok(())
}
