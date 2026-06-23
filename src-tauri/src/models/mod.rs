pub mod activity;
pub mod issue;
pub mod project;
pub mod todo;

/// The statuses an item may have. The DB `CHECK` constraint mirrors this set.
pub const ITEM_STATUSES: [&str; 3] = ["Open", "In Progress", "Done"];

/// The priorities an item may have. The DB `CHECK` constraint mirrors this set.
pub const ITEM_PRIORITIES: [&str; 3] = ["Low", "Medium", "High"];

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
