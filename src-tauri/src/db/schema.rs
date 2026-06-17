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
