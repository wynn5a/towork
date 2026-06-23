use rusqlite::Connection;
use serde_json::{json, Value};

use crate::db::schema;
use crate::models::{activity::ActivityLog, issue::Issue, normalize_status, todo::Todo, Actor};

/// JSON-Schema tool definitions advertised to MCP clients.
pub fn list_tools() -> Value {
    json!([
        {
            "name": "list_projects",
            "description": "List all projects with their id, name and description.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "list_items",
            "description": "List todos and/or issues, optionally filtered by project, status, priority, assignee or item_type.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": { "type": "string" },
                    "status": { "type": "string", "enum": ["Open", "In Progress", "Done"] },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High"] },
                    "assignee": { "type": "string", "enum": ["User", "AI"] },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] }
                }
            }
        },
        {
            "name": "create_item",
            "description": "Create a new todo or issue in a project.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "status": { "type": "string", "enum": ["Open", "In Progress", "Done"] },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High"] },
                    "assignee": { "type": "string", "enum": ["User", "AI"] }
                },
                "required": ["project_id", "item_type", "title"]
            }
        },
        {
            "name": "update_item",
            "description": "Update fields of an existing todo or issue.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "item_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "status": { "type": "string", "enum": ["Open", "In Progress", "Done"] },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High"] },
                    "assignee": { "type": "string", "enum": ["User", "AI"] }
                },
                "required": ["item_id", "item_type"]
            }
        },
        {
            "name": "complete_item",
            "description": "Mark a todo or issue as Done.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "item_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] }
                },
                "required": ["item_id", "item_type"]
            }
        },
        {
            "name": "search_items",
            "description": "Search todos and issues by title/description across all projects (or within one).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": { "type": "string" },
                    "project_id": { "type": "string" }
                },
                "required": ["query"]
            }
        },
        {
            "name": "get_activity",
            "description": "Get the activity log, optionally scoped to an item or item_type.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "item_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] }
                }
            }
        }
    ])
}

fn str_arg<'a>(args: &'a Value, key: &str) -> Option<&'a str> {
    args.get(key).and_then(|v| v.as_str())
}
fn owned(args: &Value, key: &str) -> Option<String> {
    str_arg(args, key).map(String::from)
}
fn require<'a>(args: &'a Value, key: &str) -> Result<&'a str, String> {
    str_arg(args, key).ok_or_else(|| format!("missing required argument: {key}"))
}

fn text_result(value: Value) -> Value {
    json!({
        "content": [{ "type": "text", "text": value.to_string() }],
        "isError": false
    })
}

/// Dispatch a `tools/call`. Returns the MCP tool-result payload.
pub fn call_tool(conn: &Connection, name: &str, args: Value) -> Result<Value, String> {
    match name {
        "list_projects" => {
            let projects = schema::query_projects(conn).map_err(|e| e.to_string())?;
            Ok(text_result(json!(projects)))
        }
        "list_items" => {
            let project_id = str_arg(&args, "project_id");
            let status = str_arg(&args, "status");
            let priority = str_arg(&args, "priority");
            let assignee = str_arg(&args, "assignee");
            let item_type = str_arg(&args, "item_type");

            let mut out = json!({});
            if item_type != Some("Issue") {
                let todos = schema::query_todos(conn, project_id, status, priority, assignee)
                    .map_err(|e| e.to_string())?;
                out["todos"] = json!(todos);
            }
            if item_type != Some("Todo") {
                let issues = schema::query_issues(conn, project_id, status, priority, assignee)
                    .map_err(|e| e.to_string())?;
                out["issues"] = json!(issues);
            }
            Ok(text_result(out))
        }
        "create_item" => {
            let project_id = require(&args, "project_id")?.to_string();
            let item_type = require(&args, "item_type")?;
            let title = require(&args, "title")?.to_string();
            let description = owned(&args, "description");
            // Status is optional and defaults to "Open"; reject an invalid value.
            let status = normalize_status(str_arg(&args, "status"))?;
            let priority = owned(&args, "priority");
            // Assignee defaults to AI but may be set explicitly. The creator,
            // logged on the "Created" entry, is always AI — items made over MCP
            // are authored by Claude regardless of whom they're assigned to.
            let actor = Actor::from_str(str_arg(&args, "assignee").unwrap_or("AI"));

            let value = match item_type {
                "Todo" => {
                    let todo = Todo::new(project_id, title, description, Some(status), priority, Some(actor));
                    schema::insert_todo(conn, &todo).map_err(|e| e.to_string())?;
                    log(conn, "Todo", &todo.id, "Created", Actor::AI, None, Some(todo.title.clone()))?;
                    json!(todo)
                }
                "Issue" => {
                    let issue = Issue::new(project_id, title, description, Some(status), priority, Some(actor));
                    schema::insert_issue(conn, &issue).map_err(|e| e.to_string())?;
                    log(conn, "Issue", &issue.id, "Created", Actor::AI, None, Some(issue.title.clone()))?;
                    json!(issue)
                }
                _ => return Err("item_type must be Todo or Issue".into()),
            };
            Ok(text_result(value))
        }
        "update_item" => {
            let item_id = require(&args, "item_id")?.to_string();
            let item_type = require(&args, "item_type")?;
            let title = owned(&args, "title");
            let description = owned(&args, "description");
            let status = owned(&args, "status");
            let priority = owned(&args, "priority");
            let assignee = owned(&args, "assignee");

            match item_type {
                "Todo" => {
                    let old = schema::query_todo(conn, &item_id).map_err(|e| e.to_string())?;
                    let rows = schema::update_todo(conn, &item_id, title.as_deref(), description.as_deref(), status.as_deref(), priority.as_deref(), assignee.as_deref()).map_err(|e| e.to_string())?;
                    if rows == 0 {
                        return Err(format!("no Todo with id {item_id}"));
                    }
                    if let Some(o) = old {
                        log_changes(conn, "Todo", &item_id, &o.status, &o.priority, &o.assignee, &status, &priority, &assignee, &title, &description)?;
                    }
                }
                "Issue" => {
                    let old = schema::query_issue(conn, &item_id).map_err(|e| e.to_string())?;
                    let rows = schema::update_issue(conn, &item_id, title.as_deref(), description.as_deref(), status.as_deref(), priority.as_deref(), assignee.as_deref()).map_err(|e| e.to_string())?;
                    if rows == 0 {
                        return Err(format!("no Issue with id {item_id}"));
                    }
                    if let Some(o) = old {
                        log_changes(conn, "Issue", &item_id, &o.status, &o.priority, &o.assignee, &status, &priority, &assignee, &title, &description)?;
                    }
                }
                _ => return Err("item_type must be Todo or Issue".into()),
            }
            Ok(text_result(json!({ "ok": true, "item_id": item_id })))
        }
        "complete_item" => {
            let item_id = require(&args, "item_id")?.to_string();
            let item_type = require(&args, "item_type")?;
            match item_type {
                "Todo" => {
                    let rows = schema::update_todo(conn, &item_id, None, None, Some("Done"), None, None).map_err(|e| e.to_string())?;
                    if rows == 0 {
                        return Err(format!("no Todo with id {item_id}"));
                    }
                    log(conn, "Todo", &item_id, "Completed", Actor::AI, Some("Open".into()), Some("Done".into()))?;
                }
                "Issue" => {
                    let rows = schema::update_issue(conn, &item_id, None, None, Some("Done"), None, None).map_err(|e| e.to_string())?;
                    if rows == 0 {
                        return Err(format!("no Issue with id {item_id}"));
                    }
                    log(conn, "Issue", &item_id, "Completed", Actor::AI, Some("Open".into()), Some("Done".into()))?;
                }
                _ => return Err("item_type must be Todo or Issue".into()),
            }
            Ok(text_result(json!({ "ok": true, "item_id": item_id, "status": "Done" })))
        }
        "search_items" => {
            let query = require(&args, "query")?;
            let project_id = str_arg(&args, "project_id");
            let (todos, issues) = schema::search_items(conn, query, project_id).map_err(|e| e.to_string())?;
            Ok(text_result(json!({ "todos": todos, "issues": issues })))
        }
        "get_activity" => {
            let item_id = str_arg(&args, "item_id");
            let item_type = str_arg(&args, "item_type");
            let activities = schema::query_activity(conn, item_id, item_type, None).map_err(|e| e.to_string())?;
            Ok(text_result(json!(activities)))
        }
        other => Err(format!("unknown tool: {other}")),
    }
}

fn log(
    conn: &Connection,
    item_type: &str,
    id: &str,
    action: &str,
    actor: Actor,
    old: Option<String>,
    new: Option<String>,
) -> Result<(), String> {
    let a = ActivityLog::new(item_type.into(), id.into(), action.into(), actor, old, new);
    schema::insert_activity(conn, &a).map_err(|e| e.to_string())
}

#[allow(clippy::too_many_arguments)]
fn log_changes(
    conn: &Connection,
    item_type: &str,
    id: &str,
    old_status: &str,
    old_priority: &str,
    old_assignee: &str,
    status: &Option<String>,
    priority: &Option<String>,
    assignee: &Option<String>,
    title: &Option<String>,
    description: &Option<String>,
) -> Result<(), String> {
    if let Some(s) = status {
        if s != old_status {
            let action = if s == "Done" { "Completed" } else { "StatusChanged" };
            log(conn, item_type, id, action, Actor::AI, Some(old_status.into()), Some(s.clone()))?;
        }
    }
    if let Some(p) = priority {
        if p != old_priority {
            log(conn, item_type, id, "PriorityChanged", Actor::AI, Some(old_priority.into()), Some(p.clone()))?;
        }
    }
    if let Some(a) = assignee {
        if a != old_assignee {
            log(conn, item_type, id, "AssigneeChanged", Actor::AI, Some(old_assignee.into()), Some(a.clone()))?;
        }
    }
    if title.is_some() || description.is_some() {
        log(conn, item_type, id, "Updated", Actor::AI, None, title.clone())?;
    }
    Ok(())
}
