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
        // A structurally-valid but unknown id must error, not return a
        // null-filled success — otherwise a typo is indistinguishable from a
        // real empty project. A known-but-empty project still succeeds (its
        // todos/issues arrays are simply empty). Mirrors the `project {id} not
        // found` wording used by `create_item` in `mcp/tools.rs`.
        let project = match schema::query_project(conn, id).map_err(|e| e.to_string())? {
            Some(p) => p,
            None => return Err(format!("project {id} not found")),
        };
        let todos = schema::query_todos(conn, Some(id), None, None, None).map_err(|e| e.to_string())?;
        let issues = schema::query_issues(conn, Some(id), None, None, None).map_err(|e| e.to_string())?;
        return Ok(json_content(json!({ "project": project, "todos": todos, "issues": issues })));
    }
    if let Some(id) = uri.strip_prefix("towork://item/") {
        let todo = schema::query_todo(conn, id).map_err(|e| e.to_string())?;
        let issue = schema::query_issue(conn, id).map_err(|e| e.to_string())?;
        // An id matching neither twin is unknown — error rather than return a
        // null/null/empty success. Mirrors the `no Todo with id {item_id}`
        // not-found style of `update_item`/`delete_item` in `mcp/tools.rs`.
        if todo.is_none() && issue.is_none() {
            return Err(format!("item {id} not found"));
        }
        let activities = schema::query_activity(conn, Some(id), None, None, None).map_err(|e| e.to_string())?;
        return Ok(json_content(json!({ "todo": todo, "issue": issue, "activity": activities })));
    }
    Err(format!("unknown resource uri: {uri}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;
    use crate::models::{project::Project, todo::Todo};

    /// In-memory DB with the real schema/migrations and foreign keys enabled,
    /// matching `db::init_db` (mirrors the helper in `db/schema.rs` tests).
    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run_migrations(&conn).unwrap();
        conn
    }

    /// `towork://project/{bogus}` must error for a structurally-valid but
    /// unknown id rather than return a null-filled success (the bug).
    #[test]
    fn read_unknown_project_errors() {
        let conn = test_conn();
        let err = read_resource(&conn, "towork://project/does-not-exist").unwrap_err();
        assert_eq!(err, "project does-not-exist not found");
    }

    /// `towork://item/{bogus}` must error when the id matches neither a todo
    /// nor an issue, instead of returning `{todo:null, issue:null, activity:[]}`.
    #[test]
    fn read_unknown_item_errors() {
        let conn = test_conn();
        let err = read_resource(&conn, "towork://item/does-not-exist").unwrap_err();
        assert_eq!(err, "item does-not-exist not found");
    }

    /// A genuinely-known project with NO items must STILL succeed, returning
    /// its (empty) todos/issues arrays — only an UNKNOWN id errors.
    #[test]
    fn read_known_empty_project_still_succeeds() {
        let conn = test_conn();
        let p = Project::new("Proj".into(), Some("desc".into()));
        schema::insert_project(&conn, &p).unwrap();

        let uri = format!("towork://project/{}", p.id);
        let result = read_resource(&conn, &uri).unwrap();

        // The resource wraps a single content entry whose `text` is the JSON
        // payload — parse it back and assert the project is present with empty
        // item arrays.
        let text = result[0]["text"].as_str().unwrap();
        let payload: Value = serde_json::from_str(text).unwrap();
        assert_eq!(payload["project"]["id"].as_str().unwrap(), p.id);
        assert_eq!(payload["todos"].as_array().unwrap().len(), 0);
        assert_eq!(payload["issues"].as_array().unwrap().len(), 0);
    }

    /// A real item (here a todo) still resolves successfully via
    /// `towork://item/{id}` — the existence check only rejects unknown ids.
    #[test]
    fn read_known_item_still_succeeds() {
        let conn = test_conn();
        let p = Project::new("Proj".into(), None);
        schema::insert_project(&conn, &p).unwrap();
        let t = Todo::new(p.id.clone(), "a todo".into(), None, None, None, None);
        schema::insert_todo(&conn, &t).unwrap();

        let uri = format!("towork://item/{}", t.id);
        let result = read_resource(&conn, &uri).unwrap();
        let text = result[0]["text"].as_str().unwrap();
        let payload: Value = serde_json::from_str(text).unwrap();
        assert_eq!(payload["todo"]["id"].as_str().unwrap(), t.id);
        assert!(payload["issue"].is_null());
    }
}
