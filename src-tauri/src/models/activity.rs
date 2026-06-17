use serde::{Deserialize, Serialize};

use super::Actor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: String,
    pub item_type: String,
    pub item_id: String,
    pub action: String,
    pub actor: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: String,
}

#[derive(Debug)]
pub struct ActivityLogRow {
    pub id: String,
    pub item_type: String,
    pub item_id: String,
    pub action: String,
    pub actor: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: String,
}

impl From<ActivityLogRow> for ActivityLog {
    fn from(row: ActivityLogRow) -> Self {
        Self {
            id: row.id,
            item_type: row.item_type,
            item_id: row.item_id,
            action: row.action,
            actor: row.actor,
            old_value: row.old_value,
            new_value: row.new_value,
            created_at: row.created_at,
        }
    }
}

impl ActivityLog {
    pub fn new(
        item_type: String,
        item_id: String,
        action: String,
        actor: Actor,
        old_value: Option<String>,
        new_value: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            item_type,
            item_id,
            action,
            actor: actor.as_str().to_string(),
            old_value,
            new_value,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
