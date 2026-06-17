use tauri::State;

use crate::commands::todos::log_item_changes;
use crate::db::{schema, DbState};
use crate::models::{activity::ActivityLog, issue::Issue, Actor};

#[tauri::command]
pub fn list_issues(
    state: State<'_, DbState>,
    project_id: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Vec<Issue>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_issues(
        &conn,
        project_id.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_issue(state: State<'_, DbState>, id: String) -> Result<Option<Issue>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_issue(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_issue(
    state: State<'_, DbState>,
    project_id: String,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Issue, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let actor = Actor::from_str(assignee.as_deref().unwrap_or("User"));
    let issue = Issue::new(project_id, title, description, priority, Some(actor));
    schema::insert_issue(&conn, &issue).map_err(|e| e.to_string())?;

    let activity = ActivityLog::new(
        "Issue".into(),
        issue.id.clone(),
        "Created".into(),
        actor,
        None,
        Some(issue.title.clone()),
    );
    schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
    Ok(issue)
}

#[tauri::command]
pub fn update_issue(
    state: State<'_, DbState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let old = schema::query_issue(&conn, &id).map_err(|e| e.to_string())?;

    schema::update_issue(
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
            &conn, "Issue", &id, &old.status, &old.priority, &old.assignee, &status, &priority,
            &assignee, &title, &description,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn complete_issue(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::update_issue(&conn, &id, None, None, Some("Done"), None, None)
        .map_err(|e| e.to_string())?;
    let activity = ActivityLog::new(
        "Issue".into(),
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
pub fn delete_issue(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::delete_issue(&conn, &id).map_err(|e| e.to_string())
}
