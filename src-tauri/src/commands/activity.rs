use tauri::State;

use crate::db::{schema, DbState};
use crate::models::activity::ActivityLog;
use crate::models::normalize_assignee;

#[tauri::command]
pub fn get_activity(
    state: State<'_, DbState>,
    item_id: Option<String>,
    item_type: Option<String>,
    project_id: Option<String>,
    actor: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ActivityLog>, String> {
    // Validate the actor filter when supplied (valid = User|AI) so a bad value
    // errors cleanly instead of silently returning zero rows. An absent actor
    // leaves the query actor-agnostic. The AI-presence views pass actor="AI" so
    // a burst of User-actor GUI activity can't starve the AI signal.
    let actor = match actor.as_deref() {
        Some(a) => Some(normalize_assignee(Some(a))?),
        None => None,
    };
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if let Some(pid) = project_id {
        return schema::query_activity_for_project(&conn, &pid).map_err(|e| e.to_string());
    }
    schema::query_activity(
        &conn,
        item_id.as_deref(),
        item_type.as_deref(),
        actor.as_deref(),
        limit,
    )
    .map_err(|e| e.to_string())
}
