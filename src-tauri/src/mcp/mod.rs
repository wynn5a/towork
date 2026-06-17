//! Embedded Model Context Protocol (MCP) server.
//!
//! A self-contained JSON-RPC 2.0 implementation over stdio — no external MCP
//! SDK — so the same `towork` binary can act as an MCP server when launched as
//! `towork --mcp`. It opens the same SQLite database the GUI uses, exposing
//! Towork's projects/todos/issues to AI clients (Claude, etc.) as a first-class
//! teammate: it can list, create, update, complete, and search items, read
//! resources, and serve planning prompts.

pub mod http;
pub mod prompts;
pub mod resources;
pub mod server;
pub mod tools;

pub use server::run_stdio;
