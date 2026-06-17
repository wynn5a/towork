pub mod commands;
pub mod db;
pub mod mcp;
pub mod models;

use tauri::{Emitter, Manager};

use commands::{
    activity::get_activity,
    issues::{
        complete_issue, create_issue, delete_issue, get_issue, list_issues, update_issue,
    },
    mcp::{get_mcp_address, McpAddress},
    projects::{create_project, delete_project, get_project, list_projects, update_project},
    search::search_items,
    todos::{complete_todo, create_todo, delete_todo, get_todo, list_todos, update_todo},
};
use db::DbState;

/// Build and run the Tauri GUI application.
pub fn run() {
    tauri::Builder::default()
        // single-instance must be the first plugin registered.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
                let _ = win.show();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("towork.db");
            let conn = db::init_db(&db_path).expect("failed to initialize database");
            app.manage(DbState::new(conn));

            // Start the embedded MCP server (HTTP transport) alongside the GUI,
            // sharing the same database. AI clients connect over HTTP; mutations
            // emit `towork:changed` so the UI live-refreshes.
            let addr = std::env::var("TOWORK_MCP_ADDR")
                .unwrap_or_else(|_| "127.0.0.1:4127".to_string());
            app.manage(McpAddress(addr.clone()));
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let notify = move || {
                    let _ = handle.emit("towork:changed", ());
                };
                if let Err(e) = crate::mcp::http::serve(addr, notify) {
                    eprintln!("[towork-mcp] http server stopped: {e}");
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_projects,
            get_project,
            create_project,
            update_project,
            delete_project,
            list_todos,
            get_todo,
            create_todo,
            update_todo,
            complete_todo,
            delete_todo,
            list_issues,
            get_issue,
            create_issue,
            update_issue,
            complete_issue,
            delete_issue,
            get_activity,
            search_items,
            get_mcp_address,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Towork");
}
