use rusqlite::Connection;
use serde_json::{json, Value};

use crate::db::schema;

pub fn list_resources() -> Value {
    json!([
        {
            "uri": "towork://projects",
            "name": "projects",
            "description": "List of all projects",
            "mimeType": "application/json"
        }
    ])
}

/// Read a `towork://` resource. Supports:
/// - `towork://projects`        → all projects
/// - `towork://project/{id}`    → a project with its todos + issues
/// - `towork://item/{id}`       → a todo/issue with its activity log
pub fn read_resource(conn: &Connection, uri: &str) -> Result<Value, String> {
    let json_content = |value: Value| {
        json!([{ "uri": uri, "mimeType": "application/json", "text": value.to_string() }])
    };

    if uri == "towork://projects" {
        let projects = schema::query_projects(conn).map_err(|e| e.to_string())?;
        return Ok(json_content(json!(projects)));
    }
    if let Some(id) = uri.strip_prefix("towork://project/") {
        let project = schema::query_project(conn, id).map_err(|e| e.to_string())?;
        let todos = schema::query_todos(conn, Some(id), None, None, None).map_err(|e| e.to_string())?;
        let issues = schema::query_issues(conn, Some(id), None, None, None).map_err(|e| e.to_string())?;
        return Ok(json_content(json!({ "project": project, "todos": todos, "issues": issues })));
    }
    if let Some(id) = uri.strip_prefix("towork://item/") {
        let todo = schema::query_todo(conn, id).map_err(|e| e.to_string())?;
        let issue = schema::query_issue(conn, id).map_err(|e| e.to_string())?;
        let activities = schema::query_activity(conn, Some(id), None).map_err(|e| e.to_string())?;
        return Ok(json_content(json!({ "todo": todo, "issue": issue, "activity": activities })));
    }
    Err(format!("unknown resource uri: {uri}"))
}
