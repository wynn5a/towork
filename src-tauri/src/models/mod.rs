pub mod activity;
pub mod issue;
pub mod project;
pub mod todo;

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
