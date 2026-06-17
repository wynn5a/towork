use rusqlite::params;

use crate::models::{
    activity::{ActivityLog, ActivityLogRow},
    issue::{Issue, IssueRow},
    project::{Project, ProjectRow},
    todo::{Todo, TodoRow},
};

/* ----------------------------- projects ----------------------------- */

pub fn query_projects(conn: &rusqlite::Connection) -> anyhow::Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, created_at, updated_at FROM projects ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).map(Project::from).collect())
}

pub fn query_project(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<Project>> {
    let mut stmt = conn
        .prepare("SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?1")?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    Ok(rows.next().and_then(|r| r.ok()).map(Project::from))
}

pub fn insert_project(conn: &rusqlite::Connection, project: &Project) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            project.id,
            project.name,
            project.description,
            project.created_at,
            project.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_project(
    conn: &rusqlite::Connection,
    id: &str,
    name: Option<&str>,
    description: Option<&str>,
) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(name) = name {
        conn.execute(
            "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )?;
    }
    if let Some(description) = description {
        conn.execute(
            "UPDATE projects SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![description, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_project(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}

/* ------------------------------- todos ------------------------------ */

pub fn query_todos(
    conn: &rusqlite::Connection,
    project_id: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<Vec<Todo>> {
    let mut query = String::from(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM todos WHERE 1=1",
    );
    let mut args: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(pid) = project_id {
        query.push_str(" AND project_id = ?");
        args.push(Box::new(pid.to_string()));
    }
    if let Some(s) = status {
        query.push_str(" AND status = ?");
        args.push(Box::new(s.to_string()));
    }
    if let Some(p) = priority {
        query.push_str(" AND priority = ?");
        args.push(Box::new(p.to_string()));
    }
    if let Some(a) = assignee {
        query.push_str(" AND assignee = ?");
        args.push(Box::new(a.to_string()));
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let refs: Vec<&dyn rusqlite::types::ToSql> = args.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(refs.as_slice(), |row| {
        Ok(TodoRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).map(Todo::from).collect())
}

pub fn query_todo(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<Todo>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM todos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(TodoRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    Ok(rows.next().and_then(|r| r.ok()).map(Todo::from))
}

pub fn insert_todo(conn: &rusqlite::Connection, todo: &Todo) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO todos (id, project_id, title, description, status, priority, assignee, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            todo.id,
            todo.project_id,
            todo.title,
            todo.description,
            todo.status,
            todo.priority,
            todo.assignee,
            todo.created_at,
            todo.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_todo(
    conn: &rusqlite::Connection,
    id: &str,
    title: Option<&str>,
    description: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(v) = title {
        conn.execute(
            "UPDATE todos SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = description {
        conn.execute(
            "UPDATE todos SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = status {
        conn.execute(
            "UPDATE todos SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = priority {
        conn.execute(
            "UPDATE todos SET priority = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = assignee {
        conn.execute(
            "UPDATE todos SET assignee = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_todo(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM todos WHERE id = ?1", params![id])?;
    Ok(())
}

/* ------------------------------ issues ------------------------------ */

pub fn query_issues(
    conn: &rusqlite::Connection,
    project_id: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<Vec<Issue>> {
    let mut query = String::from(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM issues WHERE 1=1",
    );
    let mut args: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(pid) = project_id {
        query.push_str(" AND project_id = ?");
        args.push(Box::new(pid.to_string()));
    }
    if let Some(s) = status {
        query.push_str(" AND status = ?");
        args.push(Box::new(s.to_string()));
    }
    if let Some(p) = priority {
        query.push_str(" AND priority = ?");
        args.push(Box::new(p.to_string()));
    }
    if let Some(a) = assignee {
        query.push_str(" AND assignee = ?");
        args.push(Box::new(a.to_string()));
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let refs: Vec<&dyn rusqlite::types::ToSql> = args.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(refs.as_slice(), |row| {
        Ok(IssueRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).map(Issue::from).collect())
}

pub fn query_issue(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<Issue>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM issues WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(IssueRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    Ok(rows.next().and_then(|r| r.ok()).map(Issue::from))
}

pub fn insert_issue(conn: &rusqlite::Connection, issue: &Issue) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO issues (id, project_id, title, description, status, priority, assignee, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            issue.id,
            issue.project_id,
            issue.title,
            issue.description,
            issue.status,
            issue.priority,
            issue.assignee,
            issue.created_at,
            issue.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_issue(
    conn: &rusqlite::Connection,
    id: &str,
    title: Option<&str>,
    description: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(v) = title {
        conn.execute(
            "UPDATE issues SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = description {
        conn.execute(
            "UPDATE issues SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = status {
        conn.execute(
            "UPDATE issues SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = priority {
        conn.execute(
            "UPDATE issues SET priority = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    if let Some(v) = assignee {
        conn.execute(
            "UPDATE issues SET assignee = ?1, updated_at = ?2 WHERE id = ?3",
            params![v, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_issue(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM issues WHERE id = ?1", params![id])?;
    Ok(())
}

/* ---------------------------- activity log -------------------------- */

pub fn insert_activity(conn: &rusqlite::Connection, activity: &ActivityLog) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO activity_log (id, item_type, item_id, action, actor, old_value, new_value, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            activity.id,
            activity.item_type,
            activity.item_id,
            activity.action,
            activity.actor,
            activity.old_value,
            activity.new_value,
            activity.created_at,
        ],
    )?;
    Ok(())
}

pub fn query_activity(
    conn: &rusqlite::Connection,
    item_id: Option<&str>,
    item_type: Option<&str>,
) -> anyhow::Result<Vec<ActivityLog>> {
    let mut query = String::from(
        "SELECT id, item_type, item_id, action, actor, old_value, new_value, created_at FROM activity_log WHERE 1=1",
    );
    let mut args: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(iid) = item_id {
        query.push_str(" AND item_id = ?");
        args.push(Box::new(iid.to_string()));
    }
    if let Some(it) = item_type {
        query.push_str(" AND item_type = ?");
        args.push(Box::new(it.to_string()));
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let refs: Vec<&dyn rusqlite::types::ToSql> = args.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(refs.as_slice(), |row| {
        Ok(ActivityLogRow {
            id: row.get(0)?,
            item_type: row.get(1)?,
            item_id: row.get(2)?,
            action: row.get(3)?,
            actor: row.get(4)?,
            old_value: row.get(5)?,
            new_value: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).map(ActivityLog::from).collect())
}

/// Project-scoped activity: rows whose `item_id` belongs to a todo/issue in
/// the given project. Used by the project Activity tab and the MCP server.
pub fn query_activity_for_project(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> anyhow::Result<Vec<ActivityLog>> {
    let mut stmt = conn.prepare(
        "SELECT a.id, a.item_type, a.item_id, a.action, a.actor, a.old_value, a.new_value, a.created_at \
         FROM activity_log a \
         WHERE a.item_id IN (SELECT id FROM todos WHERE project_id = ?1) \
            OR a.item_id IN (SELECT id FROM issues WHERE project_id = ?1) \
         ORDER BY a.created_at DESC",
    )?;
    let rows = stmt.query_map(params![project_id], |row| {
        Ok(ActivityLogRow {
            id: row.get(0)?,
            item_type: row.get(1)?,
            item_id: row.get(2)?,
            action: row.get(3)?,
            actor: row.get(4)?,
            old_value: row.get(5)?,
            new_value: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).map(ActivityLog::from).collect())
}

/* ------------------------------- search ----------------------------- */

pub fn search_items(
    conn: &rusqlite::Connection,
    query: &str,
    project_id: Option<&str>,
) -> anyhow::Result<(Vec<Todo>, Vec<Issue>)> {
    let needle = query.to_lowercase();
    let matches = |title: &str, desc: &Option<String>| -> bool {
        title.to_lowercase().contains(&needle)
            || desc
                .as_ref()
                .map(|d| d.to_lowercase().contains(&needle))
                .unwrap_or(false)
    };
    let todos = query_todos(conn, project_id, None, None, None)?
        .into_iter()
        .filter(|t| matches(&t.title, &t.description))
        .collect();
    let issues = query_issues(conn, project_id, None, None, None)?
        .into_iter()
        .filter(|i| matches(&i.title, &i.description))
        .collect();
    Ok((todos, issues))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Actor;

    /// In-memory DB with the real schema/migrations and foreign keys enabled,
    /// matching `db::init_db`.
    fn test_conn() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::db::migrations::run_migrations(&conn).unwrap();
        conn
    }

    fn seed_project(conn: &rusqlite::Connection) -> Project {
        let p = Project::new("Proj".into(), Some("desc".into()));
        insert_project(conn, &p).unwrap();
        p
    }

    /* --------------------------- projects --------------------------- */

    #[test]
    fn project_insert_query_update_delete() {
        let conn = test_conn();
        let p = seed_project(&conn);

        let fetched = query_project(&conn, &p.id).unwrap().unwrap();
        assert_eq!(fetched.name, "Proj");
        assert_eq!(fetched.description.as_deref(), Some("desc"));

        update_project(&conn, &p.id, Some("Renamed"), None).unwrap();
        let after = query_project(&conn, &p.id).unwrap().unwrap();
        assert_eq!(after.name, "Renamed");
        assert_eq!(after.description.as_deref(), Some("desc")); // unchanged

        update_project(&conn, &p.id, None, Some("new desc")).unwrap();
        assert_eq!(
            query_project(&conn, &p.id).unwrap().unwrap().description.as_deref(),
            Some("new desc")
        );

        assert_eq!(query_projects(&conn).unwrap().len(), 1);

        delete_project(&conn, &p.id).unwrap();
        assert!(query_project(&conn, &p.id).unwrap().is_none());
        assert_eq!(query_projects(&conn).unwrap().len(), 0);
    }

    #[test]
    fn deleting_project_cascades_to_todos_and_issues() {
        let conn = test_conn();
        let p = seed_project(&conn);
        let t = Todo::new(p.id.clone(), "t".into(), None, None, None);
        insert_todo(&conn, &t).unwrap();
        let i = Issue::new(p.id.clone(), "i".into(), None, None, None);
        insert_issue(&conn, &i).unwrap();

        delete_project(&conn, &p.id).unwrap();

        assert!(query_todo(&conn, &t.id).unwrap().is_none());
        assert!(query_issue(&conn, &i.id).unwrap().is_none());
    }

    /* ----------------------------- todos ---------------------------- */

    #[test]
    fn todo_insert_query_update_delete() {
        let conn = test_conn();
        let p = seed_project(&conn);
        let t = Todo::new(p.id.clone(), "Write tests".into(), None, None, None);
        insert_todo(&conn, &t).unwrap();

        let fetched = query_todo(&conn, &t.id).unwrap().unwrap();
        assert_eq!(fetched.title, "Write tests");
        assert_eq!(fetched.status, "Open");

        update_todo(
            &conn,
            &t.id,
            Some("Updated title"),
            None,
            Some("Done"),
            Some("High"),
            Some("AI"),
        )
        .unwrap();
        let after = query_todo(&conn, &t.id).unwrap().unwrap();
        assert_eq!(after.title, "Updated title");
        assert_eq!(after.status, "Done");
        assert_eq!(after.priority, "High");
        assert_eq!(after.assignee, "AI");

        delete_todo(&conn, &t.id).unwrap();
        assert!(query_todo(&conn, &t.id).unwrap().is_none());
    }

    #[test]
    fn query_todos_filters() {
        let conn = test_conn();
        let p1 = seed_project(&conn);
        let p2 = seed_project(&conn);

        insert_todo(
            &conn,
            &Todo::new(p1.id.clone(), "a".into(), None, Some("High".into()), Some(Actor::AI)),
        )
        .unwrap();
        insert_todo(
            &conn,
            &Todo::new(p1.id.clone(), "b".into(), None, Some("Low".into()), Some(Actor::User)),
        )
        .unwrap();
        insert_todo(
            &conn,
            &Todo::new(p2.id.clone(), "c".into(), None, None, None),
        )
        .unwrap();

        assert_eq!(query_todos(&conn, None, None, None, None).unwrap().len(), 3);
        assert_eq!(
            query_todos(&conn, Some(&p1.id), None, None, None).unwrap().len(),
            2
        );
        assert_eq!(
            query_todos(&conn, None, None, Some("High"), None).unwrap().len(),
            1
        );
        assert_eq!(
            query_todos(&conn, None, None, None, Some("AI")).unwrap().len(),
            1
        );
        assert_eq!(
            query_todos(&conn, Some(&p1.id), Some("Open"), Some("Low"), Some("User"))
                .unwrap()
                .len(),
            1
        );
        // No matches.
        assert_eq!(
            query_todos(&conn, None, Some("Done"), None, None).unwrap().len(),
            0
        );
    }

    /* ----------------------------- issues --------------------------- */

    #[test]
    fn issue_insert_query_update_delete() {
        let conn = test_conn();
        let p = seed_project(&conn);
        let i = Issue::new(p.id.clone(), "Bug".into(), Some("boom".into()), None, None);
        insert_issue(&conn, &i).unwrap();

        let fetched = query_issue(&conn, &i.id).unwrap().unwrap();
        assert_eq!(fetched.title, "Bug");
        assert_eq!(fetched.description.as_deref(), Some("boom"));

        update_issue(&conn, &i.id, None, None, Some("Done"), None, None).unwrap();
        assert_eq!(query_issue(&conn, &i.id).unwrap().unwrap().status, "Done");

        delete_issue(&conn, &i.id).unwrap();
        assert!(query_issue(&conn, &i.id).unwrap().is_none());
    }

    #[test]
    fn query_issues_filters_by_project() {
        let conn = test_conn();
        let p1 = seed_project(&conn);
        let p2 = seed_project(&conn);
        insert_issue(&conn, &Issue::new(p1.id.clone(), "x".into(), None, None, None)).unwrap();
        insert_issue(&conn, &Issue::new(p2.id.clone(), "y".into(), None, None, None)).unwrap();

        assert_eq!(query_issues(&conn, None, None, None, None).unwrap().len(), 2);
        assert_eq!(
            query_issues(&conn, Some(&p2.id), None, None, None).unwrap().len(),
            1
        );
    }

    /* --------------------------- activity --------------------------- */

    #[test]
    fn activity_insert_and_query_filters() {
        let conn = test_conn();
        let log = ActivityLog::new(
            "Todo".into(),
            "item-1".into(),
            "Created".into(),
            Actor::User,
            None,
            None,
        );
        insert_activity(&conn, &log).unwrap();
        let log2 = ActivityLog::new(
            "Issue".into(),
            "item-2".into(),
            "Created".into(),
            Actor::AI,
            None,
            None,
        );
        insert_activity(&conn, &log2).unwrap();

        assert_eq!(query_activity(&conn, None, None).unwrap().len(), 2);
        assert_eq!(
            query_activity(&conn, Some("item-1"), None).unwrap().len(),
            1
        );
        assert_eq!(
            query_activity(&conn, None, Some("Issue")).unwrap().len(),
            1
        );
        assert_eq!(
            query_activity(&conn, Some("item-1"), Some("Issue")).unwrap().len(),
            0
        );
    }

    #[test]
    fn activity_for_project_scopes_to_items() {
        let conn = test_conn();
        let p1 = seed_project(&conn);
        let p2 = seed_project(&conn);

        let t = Todo::new(p1.id.clone(), "t".into(), None, None, None);
        insert_todo(&conn, &t).unwrap();
        let i = Issue::new(p2.id.clone(), "i".into(), None, None, None);
        insert_issue(&conn, &i).unwrap();

        insert_activity(
            &conn,
            &ActivityLog::new("Todo".into(), t.id.clone(), "Created".into(), Actor::User, None, None),
        )
        .unwrap();
        insert_activity(
            &conn,
            &ActivityLog::new("Issue".into(), i.id.clone(), "Created".into(), Actor::User, None, None),
        )
        .unwrap();
        // Unrelated activity not tied to any item in either project.
        insert_activity(
            &conn,
            &ActivityLog::new("Todo".into(), "orphan".into(), "Created".into(), Actor::User, None, None),
        )
        .unwrap();

        assert_eq!(query_activity_for_project(&conn, &p1.id).unwrap().len(), 1);
        assert_eq!(query_activity_for_project(&conn, &p2.id).unwrap().len(), 1);
    }

    /* ----------------------------- search --------------------------- */

    #[test]
    fn search_matches_title_and_description_case_insensitive() {
        let conn = test_conn();
        let p = seed_project(&conn);
        insert_todo(
            &conn,
            &Todo::new(p.id.clone(), "Fix Login Bug".into(), None, None, None),
        )
        .unwrap();
        insert_todo(
            &conn,
            &Todo::new(p.id.clone(), "Other".into(), Some("has login text".into()), None, None),
        )
        .unwrap();
        insert_issue(
            &conn,
            &Issue::new(p.id.clone(), "Unrelated".into(), None, None, None),
        )
        .unwrap();
        insert_issue(
            &conn,
            &Issue::new(p.id.clone(), "LOGIN crash".into(), None, None, None),
        )
        .unwrap();

        let (todos, issues) = search_items(&conn, "login", None).unwrap();
        assert_eq!(todos.len(), 2); // title match + description match
        assert_eq!(issues.len(), 1); // case-insensitive title match

        let (none_t, none_i) = search_items(&conn, "zzz-no-match", None).unwrap();
        assert!(none_t.is_empty());
        assert!(none_i.is_empty());
    }

    #[test]
    fn search_respects_project_scope() {
        let conn = test_conn();
        let p1 = seed_project(&conn);
        let p2 = seed_project(&conn);
        insert_todo(&conn, &Todo::new(p1.id.clone(), "login p1".into(), None, None, None)).unwrap();
        insert_todo(&conn, &Todo::new(p2.id.clone(), "login p2".into(), None, None, None)).unwrap();

        let (todos, _) = search_items(&conn, "login", Some(&p1.id)).unwrap();
        assert_eq!(todos.len(), 1);
        assert_eq!(todos[0].project_id, p1.id);
    }
}
