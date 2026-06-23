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
///
/// The GUI and the MCP server each open their *own* connection to the one
/// SQLite file, so a human save and an AI mutation can collide. To keep those
/// concurrent writers from surfacing a raw "database is locked":
/// - `journal_mode=WAL` lets readers proceed during a write and is far more
///   concurrency-friendly than the default rollback journal. WAL is persisted
///   on the file, but re-setting it on every open is harmless/idempotent.
/// - `busy_timeout=5000` is **per-connection** (not persisted), so it must be
///   re-set on every open. It makes the rare writer-vs-writer collision
///   block-and-retry for up to 5s instead of erroring instantly.
pub fn init_db(db_path: &Path) -> anyhow::Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    // journal_mode returns a row (the resulting mode), so it must go through
    // query_row, not execute/execute_batch.
    conn.query_row("PRAGMA journal_mode = WAL;", [], |_| Ok(()))?;
    // Per-connection; rusqlite's typed helper issues `PRAGMA busy_timeout`.
    conn.busy_timeout(std::time::Duration::from_millis(5000))?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    /// A unique temp path so parallel test runs don't collide. We can't use
    /// `:memory:` here: in-memory DBs report `journal_mode=memory`, never
    /// `wal`, so WAL would be unobservable. `tempfile` isn't a dependency, so
    /// build the path from temp_dir + pid + an atomic counter ourselves.
    fn unique_temp_db_path() -> PathBuf {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "towork_init_db_test_{}_{}.db",
            std::process::id(),
            n
        ))
    }

    /// Remove the DB file and the WAL sidecars it leaves behind.
    fn cleanup(path: &Path) {
        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_file(path.with_extension("db-wal"));
        let _ = std::fs::remove_file(path.with_extension("db-shm"));
    }

    /// A connection opened through `init_db` on a real file must come back with
    /// WAL journaling and a 5s busy_timeout, so concurrent GUI + MCP writers
    /// block-and-retry instead of failing with "database is locked".
    #[test]
    fn init_db_enables_wal_and_busy_timeout() {
        let path = unique_temp_db_path();
        cleanup(&path); // in case a prior crashed run left files behind

        let conn = init_db(&path).unwrap();

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |r| r.get(0))
            .unwrap();
        assert_eq!(journal_mode.to_lowercase(), "wal");

        let busy_timeout: i64 = conn
            .query_row("PRAGMA busy_timeout;", [], |r| r.get(0))
            .unwrap();
        assert_eq!(busy_timeout, 5000);

        // foreign_keys must still be on (preserved alongside the new pragmas).
        let foreign_keys: i64 = conn
            .query_row("PRAGMA foreign_keys;", [], |r| r.get(0))
            .unwrap();
        assert_eq!(foreign_keys, 1);

        drop(conn);
        cleanup(&path);
    }
}
