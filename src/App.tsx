import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { useStore } from "./lib/store";
import { useUI } from "./lib/ui";
import { useDoubleControl } from "./lib/useDoubleControl";

/** Main application shell: sidebar + routed content. The window uses the
 *  native OS title bar (no custom chrome). */
export function App() {
  const ui = useUI();
  const { projects } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useDoubleControl(() => navigate("/simple"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.toggleCommandPalette();
        return;
      }
      // ⌘F / Ctrl+F — jump to the full-app search page. No-op while another
      // overlay is open so it doesn't fight a dialog's own handling.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (ui.isAnyOverlayOpen()) return;
        navigate("/search");
        return;
      }
      // ⌘N / Ctrl+N — open the new-todo dialog, scoped to the project you're
      // viewing (falling back to the first project). No-op while another
      // overlay is open or before any project exists.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (ui.isAnyOverlayOpen()) return;
        const onProject = location.pathname.match(/^\/project\/([^/]+)/);
        const projectId =
          onProject && projects.some((p) => p.id === onProject[1])
            ? onProject[1]
            : projects[0]?.id;
        if (!projectId) return;
        ui.openItemModal({ kind: "todo", projectId });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ui, projects, location.pathname, navigate]);

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        {/* Re-mount per route so the fade-in replays and scroll resets. */}
        <div className="main-scroll" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
