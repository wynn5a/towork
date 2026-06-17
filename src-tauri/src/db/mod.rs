pub mod migrations;
pub mod schema;

use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Shared, Tauri-managed database state.
pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }
}

/// Open the database at `db_path`, enable foreign keys, and run migrations.
pub fn init_db(db_path: &Path) -> anyhow::Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}

/// Compute the platform application-data directory for Towork.
///
/// This mirrors Tauri's `app_data_dir()` (data_dir/<identifier>) so the
/// standalone `--mcp` process opens the very same SQLite file as the GUI.
pub fn app_data_dir() -> PathBuf {
    const IDENTIFIER: &str = "com.towork.app";
    let base = if cfg!(target_os = "macos") {
        std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|h| h.join("Library").join("Application Support"))
    } else if cfg!(target_os = "windows") {
        std::env::var_os("APPDATA").map(PathBuf::from)
    } else {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME")
                    .map(PathBuf::from)
                    .map(|h| h.join(".local").join("share"))
            })
    };
    base.unwrap_or_else(|| PathBuf::from(".")).join(IDENTIFIER)
}

/// Full path to the Towork SQLite database file.
pub fn default_db_path() -> PathBuf {
    app_data_dir().join("towork.db")
}
