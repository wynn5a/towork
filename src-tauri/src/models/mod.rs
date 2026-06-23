pub mod activity;
pub mod issue;
pub mod project;
pub mod todo;

/// The statuses an item may have. The DB `CHECK` constraint mirrors this set.
pub const ITEM_STATUSES: [&str; 3] = ["Open", "In Progress", "Done"];

/// The priorities an item may have. The DB `CHECK` constraint mirrors this set.
pub const ITEM_PRIORITIES: [&str; 3] = ["Low", "Medium", "High"];

/// The assignees an item may have. Mirrors the `Actor` enum and the DB `CHECK`
/// constraint (`assignee IN ('User', 'AI')`).
pub const ITEM_ASSIGNEES: [&str; 2] = ["User", "AI"];

/// The item types a tool may target. Mirrors the `Todo`/`Issue` twins and the
/// `activity_log.item_type` `CHECK` constraint (`item_type IN ('Todo', 'Issue')`).
pub const ITEM_TYPES: [&str; 2] = ["Todo", "Issue"];

/// Normalize a caller-supplied status into the allowed set, defaulting to
/// "Open" when none is given. Returns `Err` for a non-empty but invalid value
/// so a bad status is rejected rather than silently inserted (and then
/// rejected by the DB `CHECK` with an opaque error).
pub fn normalize_status(status: Option<&str>) -> Result<String, String> {
    match status {
        None => Ok("Open".to_string()),
        Some(s) if ITEM_STATUSES.contains(&s) => Ok(s.to_string()),
        Some(s) => Err(format!(
            "invalid status: {s:?} (expected one of Open, In Progress, Done)"
        )),
    }
}

/// Normalize a caller-supplied priority into the allowed set, defaulting to
/// "Medium" when none is given. Returns `Err` for a non-empty but invalid value
/// so a bad priority is rejected rather than silently inserted (and then
/// rejected by the DB `CHECK` with an opaque error). Mirrors `normalize_status`:
/// the default ("Medium") matches `Todo`/`Issue::new`'s priority fallback.
pub fn normalize_priority(priority: Option<&str>) -> Result<String, String> {
    match priority {
        None => Ok("Medium".to_string()),
        Some(s) if ITEM_PRIORITIES.contains(&s) => Ok(s.to_string()),
        Some(s) => Err(format!(
            "invalid priority: {s:?} (expected one of Low, Medium, High)"
        )),
    }
}

/// Normalize a caller-supplied assignee into the allowed set, defaulting to
/// "User" when none is given. Returns `Err` for a non-empty but invalid value
/// so a bad assignee is rejected with a friendly message rather than forwarded
/// raw and rejected by the DB `CHECK` with an opaque error. Mirrors
/// `normalize_status`/`normalize_priority`: the default ("User") matches the
/// DB column default and `Todo`/`Issue::new`'s assignee fallback.
pub fn normalize_assignee(assignee: Option<&str>) -> Result<String, String> {
    match assignee {
        None => Ok("User".to_string()),
        Some(s) if ITEM_ASSIGNEES.contains(&s) => Ok(s.to_string()),
        Some(s) => Err(format!(
            "invalid assignee: {s:?} (expected one of User, AI)"
        )),
    }
}

/// Validate a caller-supplied item type against the allowed set
/// (`Todo`/`Issue`), returning the value or a friendly `Err`. Unlike the
/// `normalize_*` helpers there is no default: an item_type is always required
/// where it's used, so `None` is rejected. This stops a typo'd item_type from
/// silently returning zero rows (e.g. in `get_activity`/`list_items`).
pub fn validate_item_type(item_type: Option<&str>) -> Result<String, String> {
    match item_type {
        Some(s) if ITEM_TYPES.contains(&s) => Ok(s.to_string()),
        Some(s) => Err(format!(
            "invalid item_type: {s:?} (expected one of Todo, Issue)"
        )),
        None => Err("invalid item_type: missing (expected one of Todo, Issue)".into()),
    }
}

/// Validate a caller-supplied item title. Trims surrounding whitespace and
/// returns the trimmed value, or `Err` when the trimmed title is empty so a
/// blank / whitespace-only title is rejected rather than stored as an unusable
/// blank row.
pub fn validate_title(title: &str) -> Result<String, String> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err("title must not be empty".into());
    }
    Ok(trimmed.to_string())
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum Actor {
    User,
    AI,
}

impl Actor {
    pub fn as_str(&self) -> &'static str {
        match self {
            Actor::User => "User",
            Actor::AI => "AI",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "AI" => Actor::AI,
            _ => Actor::User,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_status_defaults_to_open() {
        assert_eq!(normalize_status(None).unwrap(), "Open");
    }

    #[test]
    fn normalize_status_accepts_allowed_values() {
        for s in ITEM_STATUSES {
            assert_eq!(normalize_status(Some(s)).unwrap(), s);
        }
    }

    #[test]
    fn normalize_status_rejects_invalid() {
        assert!(normalize_status(Some("in progress")).is_err()); // case-sensitive
        assert!(normalize_status(Some("Bogus")).is_err());
        assert!(normalize_status(Some("")).is_err());
    }

    #[test]
    fn normalize_priority_defaults_to_medium() {
        // Matches Todo/Issue::new's priority fallback when none is supplied.
        assert_eq!(normalize_priority(None).unwrap(), "Medium");
    }

    #[test]
    fn normalize_priority_accepts_allowed_values() {
        for p in ITEM_PRIORITIES {
            assert_eq!(normalize_priority(Some(p)).unwrap(), p);
        }
    }

    #[test]
    fn normalize_priority_rejects_invalid() {
        assert!(normalize_priority(Some("Urgent")).is_err()); // the repro case
        assert!(normalize_priority(Some("low")).is_err()); // case-sensitive
        assert!(normalize_priority(Some("Bogus")).is_err());
        assert!(normalize_priority(Some("")).is_err());
    }

    #[test]
    fn normalize_assignee_defaults_to_user() {
        // Matches the DB column default and Todo/Issue::new's assignee fallback.
        assert_eq!(normalize_assignee(None).unwrap(), "User");
    }

    #[test]
    fn normalize_assignee_accepts_allowed_values() {
        for a in ITEM_ASSIGNEES {
            assert_eq!(normalize_assignee(Some(a)).unwrap(), a);
        }
    }

    #[test]
    fn normalize_assignee_rejects_invalid() {
        assert!(normalize_assignee(Some("Banana")).is_err()); // the repro case
        assert!(normalize_assignee(Some("user")).is_err()); // case-sensitive
        assert!(normalize_assignee(Some("ai")).is_err()); // case-sensitive
        assert!(normalize_assignee(Some("")).is_err());
    }

    #[test]
    fn validate_item_type_accepts_allowed_values() {
        for t in ITEM_TYPES {
            assert_eq!(validate_item_type(Some(t)).unwrap(), t);
        }
    }

    #[test]
    fn validate_item_type_rejects_invalid() {
        assert!(validate_item_type(Some("Banana")).is_err()); // the repro case
        assert!(validate_item_type(Some("todo")).is_err()); // case-sensitive
        assert!(validate_item_type(Some("issue")).is_err()); // case-sensitive
        assert!(validate_item_type(Some("")).is_err());
        assert!(validate_item_type(None).is_err()); // no default: required
    }

    #[test]
    fn validate_title_rejects_blank() {
        assert!(validate_title("").is_err());
        assert!(validate_title("   ").is_err()); // whitespace-only
        assert!(validate_title("\t\n").is_err()); // other whitespace
    }

    #[test]
    fn validate_title_accepts_normal_title() {
        assert_eq!(validate_title("Buy milk").unwrap(), "Buy milk");
    }

    #[test]
    fn validate_title_trims_surrounding_whitespace() {
        assert_eq!(validate_title("  hi  ").unwrap(), "hi");
    }

    #[test]
    fn actor_as_str() {
        assert_eq!(Actor::User.as_str(), "User");
        assert_eq!(Actor::AI.as_str(), "AI");
    }

    #[test]
    fn actor_from_str_known() {
        assert_eq!(Actor::from_str("AI"), Actor::AI);
        assert_eq!(Actor::from_str("User"), Actor::User);
    }

    #[test]
    fn actor_from_str_unknown_defaults_to_user() {
        assert_eq!(Actor::from_str("anything-else"), Actor::User);
        assert_eq!(Actor::from_str(""), Actor::User);
        // case-sensitive: only exact "AI" maps to AI
        assert_eq!(Actor::from_str("ai"), Actor::User);
    }

    #[test]
    fn actor_round_trip() {
        for actor in [Actor::User, Actor::AI] {
            assert_eq!(Actor::from_str(actor.as_str()), actor);
        }
    }

    #[test]
    fn actor_serde_round_trip() {
        for actor in [Actor::User, Actor::AI] {
            let json = serde_json::to_string(&actor).unwrap();
            let back: Actor = serde_json::from_str(&json).unwrap();
            assert_eq!(back, actor);
        }
        assert_eq!(serde_json::to_string(&Actor::AI).unwrap(), "\"AI\"");
    }
}
