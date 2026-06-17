use tauri::State;

/// The address the embedded MCP HTTP server is bound to (managed Tauri state).
pub struct McpAddress(pub String);

#[tauri::command]
pub fn get_mcp_address(state: State<'_, McpAddress>) -> String {
    state.0.clone()
}
