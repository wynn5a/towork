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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_sets_fields_and_actor_string() {
        let log = ActivityLog::new(
            "Todo".into(),
            "item-1".into(),
            "StatusChanged".into(),
            Actor::AI,
            Some("Open".into()),
            Some("Done".into()),
        );
        assert_eq!(log.item_type, "Todo");
        assert_eq!(log.item_id, "item-1");
        assert_eq!(log.action, "StatusChanged");
        assert_eq!(log.actor, "AI");
        assert_eq!(log.old_value.as_deref(), Some("Open"));
        assert_eq!(log.new_value.as_deref(), Some("Done"));
        assert!(!log.id.is_empty());
        assert!(!log.created_at.is_empty());
    }

    #[test]
    fn new_allows_no_old_new_values() {
        let log = ActivityLog::new(
            "Issue".into(),
            "i1".into(),
            "Created".into(),
            Actor::User,
            None,
            None,
        );
        assert_eq!(log.actor, "User");
        assert_eq!(log.old_value, None);
        assert_eq!(log.new_value, None);
    }

    #[test]
    fn from_row_maps_all_fields() {
        let row = ActivityLogRow {
            id: "id".into(),
            item_type: "Todo".into(),
            item_id: "iid".into(),
            action: "Completed".into(),
            actor: "AI".into(),
            old_value: None,
            new_value: Some("Done".into()),
            created_at: "c".into(),
        };
        let log: ActivityLog = row.into();
        assert_eq!(log.id, "id");
        assert_eq!(log.action, "Completed");
        assert_eq!(log.new_value.as_deref(), Some("Done"));
    }
}
