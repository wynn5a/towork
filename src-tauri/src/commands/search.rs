use serde::Serialize;
use tauri::State;

use crate::db::{schema, DbState};
use crate::models::{issue::Issue, todo::Todo};

#[derive(Serialize)]
pub struct SearchResult {
    pub todos: Vec<Todo>,
    pub issues: Vec<Issue>,
}

#[tauri::command]
pub fn search_items(
    state: State<'_, DbState>,
    query: String,
    project_id: Option<String>,
) -> Result<SearchResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let (todos, issues) =
        schema::search_items(&conn, &query, project_id.as_deref()).map_err(|e| e.to_string())?;
    Ok(SearchResult { todos, issues })
}
