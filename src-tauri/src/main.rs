// Hide the extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // When launched as `towork --mcp`, run the embedded MCP server over stdio
    // instead of opening the GUI. An AI client (Claude, etc.) spawns the binary
    // this way and talks JSON-RPC over stdin/stdout.
    if std::env::args().any(|a| a == "--mcp") {
        if let Err(e) = towork_lib::mcp::run_stdio() {
            eprintln!("[towork-mcp] fatal: {e}");
            std::process::exit(1);
        }
        return;
    }

    towork_lib::run();
}
