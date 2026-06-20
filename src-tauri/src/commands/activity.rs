use tauri::State;

use crate::db::{schema, DbState};
use crate::models::activity::ActivityLog;

#[tauri::command]
pub fn get_activity(
    state: State<'_, DbState>,
    item_id: Option<String>,
    item_type: Option<String>,
    project_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ActivityLog>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if let Some(pid) = project_id {
        return schema::query_activity_for_project(&conn, &pid).map_err(|e| e.to_string());
    }
    schema::query_activity(&conn, item_id.as_deref(), item_type.as_deref(), limit)
        .map_err(|e| e.to_string())
}
