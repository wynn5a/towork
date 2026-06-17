import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { useUI } from "./lib/ui";
import { useDoubleShift } from "./lib/useDoubleShift";

/** Main application shell: sidebar + routed content. The window uses the
 *  native OS title bar (no custom chrome). */
export function App() {
  const ui = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  useDoubleShift(() => navigate("/simple"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.toggleCommandPalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ui]);

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
