use tauri::State;

use crate::db::{schema, DbState};
use crate::models::{activity::ActivityLog, normalize_status, todo::Todo, validate_title, Actor};

#[tauri::command]
pub fn list_todos(
    state: State<'_, DbState>,
    project_id: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Vec<Todo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_todos(
        &conn,
        project_id.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_todo(state: State<'_, DbState>, id: String) -> Result<Option<Todo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_todo(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_todo(
    state: State<'_, DbState>,
    project_id: String,
    title: String,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Todo, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let actor = Actor::from_str(assignee.as_deref().unwrap_or("User"));
    let status = normalize_status(status.as_deref())?;
    // Reject a blank / whitespace-only title and store the trimmed value, so the
    // GUI write path agrees with MCP at the data layer.
    let title = validate_title(&title)?;
    let todo = Todo::new(project_id, title, description, Some(status), priority, Some(actor));
    schema::insert_todo(&conn, &todo).map_err(|e| e.to_string())?;

    // The creator is the GUI user, even when the item is *assigned* to AI —
    // only items created over MCP are authored by Claude.
    let activity = ActivityLog::new(
        "Todo".into(),
        todo.id.clone(),
        "Created".into(),
        Actor::User,
        None,
        Some(todo.title.clone()),
    )
    .with_project(todo.project_id.clone());
    schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
    Ok(todo)
}

#[tauri::command]
pub fn update_todo(
    state: State<'_, DbState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let old = schema::query_todo(&conn, &id).map_err(|e| e.to_string())?;

    // When a title is supplied, reject blank / whitespace-only and store the
    // trimmed value; an absent title leaves the existing one alone.
    let title = match title {
        Some(t) => Some(validate_title(&t)?),
        None => None,
    };

    schema::update_todo(
        &conn,
        &id,
        title.as_deref(),
        description.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    if let Some(old) = old {
        log_item_changes(
            &conn, "Todo", &id, &old.status, &old.priority, &old.assignee, &old.title,
            old.description.as_deref(), &status, &priority, &assignee, &title, &description,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn complete_todo(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    // Read the current status BEFORE marking Done so the activity log records the
    // real prior state (e.g. "In Progress"), not a hardcoded "Open".
    let prior_status = schema::query_todo(&conn, &id)
        .map_err(|e| e.to_string())?
        .map(|t| t.status);
    schema::update_todo(&conn, &id, None, None, Some("Done"), None, None)
        .map_err(|e| e.to_string())?;
    // Skip a redundant "Completed" row if the item was already Done.
    if prior_status.as_deref() != Some("Done") {
        let activity = ActivityLog::new(
            "Todo".into(),
            id,
            "Completed".into(),
            Actor::User,
            prior_status,
            Some("Done".into()),
        );
        schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_todo(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    // Capture the title and owning project before deleting so the activity entry
    // is meaningful and stays project-scoped. `activity_log.item_id` has no FK to
    // `todos`, so the row survives the delete — but the item's `project_id` would
    // be unrecoverable afterwards, so we stamp it onto the activity here.
    let existing = schema::query_todo(&conn, &id).map_err(|e| e.to_string())?;
    let title = existing.as_ref().map(|t| t.title.clone());
    let project_id = existing.map(|t| t.project_id);
    schema::delete_todo(&conn, &id).map_err(|e| e.to_string())?;
    let mut activity = ActivityLog::new("Todo".into(), id, "Deleted".into(), Actor::User, None, title);
    if let Some(pid) = project_id {
        activity = activity.with_project(pid);
    }
    schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
    Ok(())
}

/// Shared change-logging used by both todo and issue updates. `User` is the
/// actor since these mutations come from the GUI; MCP mutations log as `AI`.
#[allow(clippy::too_many_arguments)]
pub(crate) fn log_item_changes(
    conn: &rusqlite::Connection,
    item_type: &str,
    id: &str,
    old_status: &str,
    old_priority: &str,
    old_assignee: &str,
    old_title: &str,
    old_description: Option<&str>,
    status: &Option<String>,
    priority: &Option<String>,
    assignee: &Option<String>,
    title: &Option<String>,
    description: &Option<String>,
) -> anyhow::Result<()> {
    if let Some(s) = status {
        if s != old_status {
            let action = if s == "Done" { "Completed" } else { "StatusChanged" };
            schema::insert_activity(
                conn,
                &ActivityLog::new(item_type.into(), id.into(), action.into(), Actor::User, Some(old_status.into()), Some(s.clone())),
            )?;
        }
    }
    if let Some(p) = priority {
        if p != old_priority {
            schema::insert_activity(
                conn,
                &ActivityLog::new(item_type.into(), id.into(), "PriorityChanged".into(), Actor::User, Some(old_priority.into()), Some(p.clone())),
            )?;
        }
    }
    if let Some(a) = assignee {
        if a != old_assignee {
            schema::insert_activity(
                conn,
                &ActivityLog::new(item_type.into(), id.into(), "AssigneeChanged".into(), Actor::User, Some(old_assignee.into()), Some(a.clone())),
            )?;
        }
    }
    let title_changed = title.as_deref().map_or(false, |t| t != old_title);
    let desc_changed = description.as_deref().map_or(false, |d| Some(d) != old_description);
    if title_changed || desc_changed {
        schema::insert_activity(
            conn,
            &ActivityLog::new(item_type.into(), id.into(), "Updated".into(), Actor::User, None, title.clone()),
        )?;
    }
    Ok(())
}
