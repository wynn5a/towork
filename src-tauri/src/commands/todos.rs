use tauri::State;

use crate::db::{schema, DbState};
use crate::models::{activity::ActivityLog, todo::Todo, Actor};

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
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Todo, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let actor = Actor::from_str(assignee.as_deref().unwrap_or("User"));
    let todo = Todo::new(project_id, title, description, priority, Some(actor));
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
    );
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
    schema::update_todo(&conn, &id, None, None, Some("Done"), None, None)
        .map_err(|e| e.to_string())?;
    let activity = ActivityLog::new(
        "Todo".into(),
        id,
        "Completed".into(),
        Actor::User,
        Some("Open".into()),
        Some("Done".into()),
    );
    schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_todo(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::delete_todo(&conn, &id).map_err(|e| e.to_string())
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
