use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug)]
pub struct ProjectRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<ProjectRow> for Project {
    fn from(row: ProjectRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            description: row.description,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl Project {
    pub fn new(name: String, description: Option<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_sets_fields() {
        let p = Project::new("Work".into(), Some("my stuff".into()));
        assert_eq!(p.name, "Work");
        assert_eq!(p.description.as_deref(), Some("my stuff"));
        assert!(!p.id.is_empty());
        assert_eq!(p.id.len(), 36);
        assert_eq!(p.created_at, p.updated_at);
    }

    #[test]
    fn new_allows_no_description() {
        let p = Project::new("Personal".into(), None);
        assert_eq!(p.description, None);
    }

    #[test]
    fn from_row_maps_all_fields() {
        let row = ProjectRow {
            id: "id".into(),
            name: "n".into(),
            description: Some("d".into()),
            created_at: "c".into(),
            updated_at: "u".into(),
        };
        let project: Project = row.into();
        assert_eq!(project.id, "id");
        assert_eq!(project.name, "n");
        assert_eq!(project.description.as_deref(), Some("d"));
    }
}
