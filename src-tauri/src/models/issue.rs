use serde::{Deserialize, Serialize};

use super::Actor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Issue {
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
pub struct IssueRow {
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

impl From<IssueRow> for Issue {
    fn from(row: IssueRow) -> Self {
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

impl Issue {
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
