use serde::{Deserialize, Serialize};

use super::Actor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub assignee: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug)]
pub struct TodoRow {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub assignee: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<TodoRow> for Todo {
    fn from(row: TodoRow) -> Self {
        Self {
            id: row.id,
            project_id: row.project_id,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            assignee: row.assignee,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl Todo {
    pub fn new(
        project_id: String,
        title: String,
        description: Option<String>,
        priority: Option<String>,
        assignee: Option<Actor>,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            title,
            description,
            status: "Open".to_string(),
            priority: priority.unwrap_or_else(|| "Medium".to_string()),
            assignee: assignee
                .map(|a| a.as_str().to_string())
                .unwrap_or_else(|| "User".to_string()),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_sets_defaults() {
        let t = Todo::new("p1".into(), "Buy milk".into(), None, None, None);
        assert_eq!(t.project_id, "p1");
        assert_eq!(t.title, "Buy milk");
        assert_eq!(t.description, None);
        assert_eq!(t.status, "Open");
        assert_eq!(t.priority, "Medium");
        assert_eq!(t.assignee, "User");
        assert!(!t.id.is_empty());
        // created_at and updated_at are equal at construction.
        assert_eq!(t.created_at, t.updated_at);
    }

    #[test]
    fn new_honors_overrides() {
        let t = Todo::new(
            "p1".into(),
            "Title".into(),
            Some("desc".into()),
            Some("High".into()),
            Some(Actor::AI),
        );
        assert_eq!(t.description.as_deref(), Some("desc"));
        assert_eq!(t.priority, "High");
        assert_eq!(t.assignee, "AI");
        assert_eq!(t.status, "Open"); // always Open on creation
    }

    #[test]
    fn new_generates_unique_ids() {
        let a = Todo::new("p".into(), "a".into(), None, None, None);
        let b = Todo::new("p".into(), "b".into(), None, None, None);
        assert_ne!(a.id, b.id);
        // ids are uuids -> 36 chars.
        assert_eq!(a.id.len(), 36);
    }

    #[test]
    fn from_row_maps_all_fields() {
        let row = TodoRow {
            id: "id".into(),
            project_id: "pid".into(),
            title: "t".into(),
            description: Some("d".into()),
            status: "Done".into(),
            priority: "Low".into(),
            assignee: "AI".into(),
            created_at: "c".into(),
            updated_at: "u".into(),
        };
        let todo: Todo = row.into();
        assert_eq!(todo.id, "id");
        assert_eq!(todo.project_id, "pid");
        assert_eq!(todo.title, "t");
        assert_eq!(todo.description.as_deref(), Some("d"));
        assert_eq!(todo.status, "Done");
        assert_eq!(todo.priority, "Low");
        assert_eq!(todo.assignee, "AI");
        assert_eq!(todo.created_at, "c");
        assert_eq!(todo.updated_at, "u");
    }

    #[test]
    fn serde_round_trip() {
        let t = Todo::new("p".into(), "title".into(), Some("d".into()), None, None);
        let json = serde_json::to_string(&t).unwrap();
        let back: Todo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, t.id);
        assert_eq!(back.title, t.title);
        assert_eq!(back.status, t.status);
    }
}
