use rusqlite::{params, Connection};

pub fn run_migrations(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(include_str!("../../migrations/001_initial.sql"))?;
    // `001_initial.sql` uses `CREATE TABLE IF NOT EXISTS`, so a database created
    // before "In Progress" existed keeps its old `CHECK (status IN ('Open',
    // 'Done'))` constraint and would reject "In Progress" at runtime. Rebuild
    // those tables in place if needed. Idempotent: a no-op once the constraint
    // already allows "In Progress" (including freshly-created databases).
    ensure_status_allows_in_progress(conn, "todos")?;
    ensure_status_allows_in_progress(conn, "issues")?;
    ensure_activity_log_has_project_id(conn)?;
    Ok(())
}

/// Add the `activity_log.project_id` column (and backfill it from the still-living
/// items) for databases created before it existed. Without it the project Activity
/// tab joined back to `todos`/`issues` to find a row's project, so once an item was
/// deleted its activity dropped out of the feed. Idempotent: a no-op once the
/// column is present (fresh DBs already have it via `001_initial.sql`).
fn ensure_activity_log_has_project_id(conn: &Connection) -> anyhow::Result<()> {
    let has_column: bool = conn
        .prepare("SELECT 1 FROM pragma_table_info('activity_log') WHERE name = 'project_id'")?
        .exists([])?;
    if has_column {
        // Fresh DB (column came from 001_initial.sql) or already migrated. The
        // index lives here (not in the SQL file), so ensure it exists either way.
        conn.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id);",
        )?;
        return Ok(());
    }

    let tx = conn.unchecked_transaction()?;
    tx.execute_batch(
        "ALTER TABLE activity_log ADD COLUMN project_id TEXT;
         CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id);
         -- Backfill from items that still exist; rows for already-deleted items
         -- stay NULL (their project is unrecoverable, but at least live items'
         -- history becomes project-scoped).
         UPDATE activity_log
            SET project_id = (SELECT project_id FROM todos WHERE todos.id = activity_log.item_id)
          WHERE item_type = 'Todo' AND project_id IS NULL;
         UPDATE activity_log
            SET project_id = (SELECT project_id FROM issues WHERE issues.id = activity_log.item_id)
          WHERE item_type = 'Issue' AND project_id IS NULL;",
    )?;
    tx.commit()?;
    Ok(())
}

/// Widen a todos/issues table's `status` CHECK to allow 'In Progress',
/// preserving all rows. Safe to run on every connection: if the table's stored
/// DDL already mentions "In Progress" (fresh DB or already-migrated), it does
/// nothing.
fn ensure_status_allows_in_progress(conn: &Connection, table: &str) -> anyhow::Result<()> {
    let create_sql: Option<String> = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?1",
            params![table],
            |row| row.get(0),
        )
        .ok();

    let create_sql = match create_sql {
        Some(s) => s,
        // Table doesn't exist (shouldn't happen after the batch above) — nothing
        // to rebuild.
        None => return Ok(()),
    };

    // Already allows "In Progress" — fresh DB or previously migrated. No-op.
    if create_sql.contains("In Progress") {
        return Ok(());
    }

    // Foreign keys must be off while we drop/rename the table; toggling it is a
    // no-op statement, not a schema change, so it's safe to run repeatedly.
    conn.execute_batch("PRAGMA foreign_keys = OFF;")?;

    let tx = conn.unchecked_transaction()?;
    let tmp = format!("{table}_migrate_new");

    // Recreate with the SAME columns in the SAME order (so `SELECT *` lines up)
    // but with the widened status CHECK and the FK to projects preserved.
    tx.execute_batch(&format!(
        "CREATE TABLE {tmp} (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Done')),
            priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
            assignee TEXT NOT NULL DEFAULT 'User' CHECK (assignee IN ('User', 'AI')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        INSERT INTO {tmp} SELECT * FROM {table};
        DROP TABLE {table};
        ALTER TABLE {tmp} RENAME TO {table};
        CREATE INDEX IF NOT EXISTS idx_{table}_project_id ON {table}(project_id);
        CREATE INDEX IF NOT EXISTS idx_{table}_status ON {table}(status);
        CREATE INDEX IF NOT EXISTS idx_{table}_assignee ON {table}(assignee);"
    ))?;

    tx.commit()?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The OLD (pre-"In Progress") DDL, including the two-value status CHECK.
    fn old_table_sql(table: &str) -> String {
        format!(
            "CREATE TABLE {table} (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Done')),
                priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
                assignee TEXT NOT NULL DEFAULT 'User' CHECK (assignee IN ('User', 'AI')),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );"
        )
    }

    /// Simulate an OLD database: projects + todos/issues with the two-value
    /// status CHECK, seeded with one Open row each. run_migrations must widen
    /// the constraint, accept "In Progress", and preserve the existing rows.
    #[test]
    fn migration_widens_existing_db_to_allow_in_progress() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        conn.execute_batch(
            "CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )
        .unwrap();
        conn.execute_batch(&old_table_sql("todos")).unwrap();
        conn.execute_batch(&old_table_sql("issues")).unwrap();

        conn.execute(
            "INSERT INTO projects (id, name) VALUES ('p1', 'Proj')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO todos (id, project_id, title, status) VALUES ('t1', 'p1', 'todo', 'Open')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO issues (id, project_id, title, status) VALUES ('i1', 'p1', 'issue', 'Open')",
            [],
        )
        .unwrap();

        // Pre-migration: "In Progress" must be rejected by the old constraint.
        assert!(conn
            .execute("UPDATE todos SET status = 'In Progress' WHERE id = 't1'", [])
            .is_err());

        run_migrations(&conn).unwrap();

        // Existing rows preserved.
        let todo_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM todos", [], |r| r.get(0))
            .unwrap();
        let issue_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM issues", [], |r| r.get(0))
            .unwrap();
        assert_eq!(todo_count, 1);
        assert_eq!(issue_count, 1);

        // "In Progress" now accepted for both tables.
        conn.execute("UPDATE todos SET status = 'In Progress' WHERE id = 't1'", [])
            .unwrap();
        conn.execute("UPDATE issues SET status = 'In Progress' WHERE id = 'i1'", [])
            .unwrap();
        let s: String = conn
            .query_row("SELECT status FROM todos WHERE id = 't1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(s, "In Progress");

        // Running again is a safe no-op (idempotent), and rows survive.
        run_migrations(&conn).unwrap();
        let todo_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM todos", [], |r| r.get(0))
            .unwrap();
        assert_eq!(todo_count, 1);
    }

    /// An OLD database whose `activity_log` predates the `project_id` column
    /// must gain the column, backfill it from still-living items, and leave rows
    /// for already-deleted items NULL. Idempotent on re-run.
    #[test]
    fn migration_adds_and_backfills_activity_project_id() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        // Minimal OLD schema: projects/todos plus an activity_log WITHOUT project_id.
        conn.execute_batch(
            "CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
                 created_at TEXT NOT NULL DEFAULT (datetime('now')),
                 updated_at TEXT NOT NULL DEFAULT (datetime('now')));
             CREATE TABLE todos (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
                 description TEXT, status TEXT NOT NULL DEFAULT 'Open', priority TEXT NOT NULL DEFAULT 'Medium',
                 assignee TEXT NOT NULL DEFAULT 'User',
                 created_at TEXT NOT NULL DEFAULT (datetime('now')),
                 updated_at TEXT NOT NULL DEFAULT (datetime('now')));
             CREATE TABLE issues (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
                 description TEXT, status TEXT NOT NULL DEFAULT 'Open', priority TEXT NOT NULL DEFAULT 'Medium',
                 assignee TEXT NOT NULL DEFAULT 'User',
                 created_at TEXT NOT NULL DEFAULT (datetime('now')),
                 updated_at TEXT NOT NULL DEFAULT (datetime('now')));
             CREATE TABLE activity_log (id TEXT PRIMARY KEY, item_type TEXT NOT NULL, item_id TEXT NOT NULL,
                 action TEXT NOT NULL, actor TEXT NOT NULL, old_value TEXT, new_value TEXT,
                 created_at TEXT NOT NULL DEFAULT (datetime('now')));
             INSERT INTO projects (id, name) VALUES ('p1', 'Proj');
             INSERT INTO todos (id, project_id, title) VALUES ('t1', 'p1', 'live');
             -- Activity for a live item (backfillable) and a since-deleted item (not).
             INSERT INTO activity_log (id, item_type, item_id, action, actor) VALUES ('a1', 'Todo', 't1', 'Created', 'User');
             INSERT INTO activity_log (id, item_type, item_id, action, actor) VALUES ('a2', 'Todo', 'gone', 'Deleted', 'User');",
        )
        .unwrap();

        run_migrations(&conn).unwrap();

        let backfilled: Option<String> = conn
            .query_row("SELECT project_id FROM activity_log WHERE id = 'a1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(backfilled.as_deref(), Some("p1"));
        let orphan: Option<String> = conn
            .query_row("SELECT project_id FROM activity_log WHERE id = 'a2'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(orphan, None);

        // Idempotent: re-running doesn't error or duplicate the column.
        run_migrations(&conn).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM activity_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    /// A fresh migrated schema accepts an "In Progress" row for both tables.
    #[test]
    fn fresh_schema_accepts_in_progress() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        run_migrations(&conn).unwrap();

        conn.execute(
            "INSERT INTO projects (id, name) VALUES ('p1', 'Proj')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO todos (id, project_id, title, status) VALUES ('t1', 'p1', 'todo', 'In Progress')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO issues (id, project_id, title, status) VALUES ('i1', 'p1', 'issue', 'In Progress')",
            [],
        )
        .unwrap();

        let st: String = conn
            .query_row("SELECT status FROM todos WHERE id = 't1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(st, "In Progress");
        let si: String = conn
            .query_row("SELECT status FROM issues WHERE id = 'i1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(si, "In Progress");
    }
}
