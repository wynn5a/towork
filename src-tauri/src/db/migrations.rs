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
