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
