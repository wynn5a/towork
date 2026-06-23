use rusqlite::Connection;
use serde_json::{json, Value};

use crate::db::schema;

pub fn list_prompts() -> Value {
    json!([
        {
            "name": "daily_review",
            "description": "Summarize open items and recent activity",
            "arguments": []
        },
        {
            "name": "plan_day",
            "description": "Suggest task ordering based on priority",
            "arguments": []
        }
    ])
}

fn user_message(text: String) -> Value {
    json!({ "role": "user", "content": { "type": "text", "text": text } })
}

pub fn get_prompt(conn: &Connection, name: &str) -> Result<Value, String> {
    match name {
        "daily_review" => {
            let todos = schema::query_todos(conn, None, Some("Open"), None, None).map_err(|e| e.to_string())?;
            let issues = schema::query_issues(conn, None, Some("Open"), None, None).map_err(|e| e.to_string())?;
            let recent: Vec<_> = schema::query_activity(conn, None, None, None, Some(10))
                .map_err(|e| e.to_string())?
                .into_iter()
                .take(10)
                .collect();

            let text = format!(
                "Daily Review\n\nOpen todos ({}):\n{}\n\nOpen issues ({}):\n{}\n\nRecent activity:\n{}",
                todos.len(),
                todos.iter().map(|t| format!("- {} [{}] ({})", t.title, t.priority, t.assignee)).collect::<Vec<_>>().join("\n"),
                issues.len(),
                issues.iter().map(|i| format!("- {} [{}] ({})", i.title, i.priority, i.assignee)).collect::<Vec<_>>().join("\n"),
                recent.iter().map(|a| format!("- {} {} by {} at {}", a.action, a.item_type, a.actor, a.created_at)).collect::<Vec<_>>().join("\n"),
            );
            Ok(json!({
                "description": "Summary of open items and recent activity",
                "messages": [user_message(text)]
            }))
        }
        "plan_day" => {
            let todos = schema::query_todos(conn, None, Some("Open"), None, None).map_err(|e| e.to_string())?;
            let issues = schema::query_issues(conn, None, Some("Open"), None, None).map_err(|e| e.to_string())?;

            let mut items: Vec<(String, String, String)> = Vec::new();
            for t in &todos {
                items.push((t.title.clone(), t.priority.clone(), t.assignee.clone()));
            }
            for i in &issues {
                items.push((i.title.clone(), i.priority.clone(), i.assignee.clone()));
            }
            let rank = |p: &str| match p {
                "High" => 0,
                "Medium" => 1,
                "Low" => 2,
                _ => 3,
            };
            items.sort_by(|a, b| rank(&a.1).cmp(&rank(&b.1)));

            let text = format!(
                "Suggested task order for today (highest priority first):\n\n{}",
                items
                    .iter()
                    .enumerate()
                    .map(|(i, (title, priority, assignee))| format!("{}. {} [{}] — {}", i + 1, title, priority, assignee))
                    .collect::<Vec<_>>()
                    .join("\n")
            );
            Ok(json!({
                "description": "Priority-ordered plan for the day",
                "messages": [user_message(text)]
            }))
        }
        other => Err(format!("unknown prompt: {other}")),
    }
}
