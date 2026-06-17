use tauri::State;

use crate::db::{schema, DbState};
use crate::models::project::Project;

#[tauri::command]
pub fn list_projects(state: State<'_, DbState>) -> Result<Vec<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_projects(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(state: State<'_, DbState>, id: String) -> Result<Option<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_project(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(
    state: State<'_, DbState>,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let project = Project::new(name, description);
    schema::insert_project(&conn, &project).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub fn update_project(
    state: State<'_, DbState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::update_project(&conn, &id, name.as_deref(), description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::delete_project(&conn, &id).map_err(|e| e.to_string())
}
