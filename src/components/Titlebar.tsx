import { useStore } from "../lib/store";
import { useLocation } from "react-router-dom";

/**
 * Desktop window chrome. On macOS the native traffic lights show through the
 * overlay title-bar style, so this strip is mostly a draggable region + title.
 */
export function Titlebar() {
  const { projectById } = useStore();
  const loc = useLocation();
  let label = "Towork";
  const m = loc.pathname.match(/^\/project\/(.+)$/);
  if (m) {
    const p = projectById(m[1]);
    if (p) label = `Towork — ${p.name}`;
  }
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="tb-title" data-tauri-drag-region>
        {label}
      </div>
    </div>
  );
}
