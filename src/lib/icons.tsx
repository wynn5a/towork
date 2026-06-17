// Line icons ported from the Towork prototype (Data Buddy 1.5px style).
import type { CSSProperties } from "react";

export type IconName =
  | "search"
  | "plus"
  | "inbox"
  | "project"
  | "todo"
  | "issue"
  | "activity"
  | "check"
  | "chevron"
  | "chevDown"
  | "more"
  | "edit"
  | "trash"
  | "ai"
  | "user"
  | "clock"
  | "x"
  | "command"
  | "arrow"
  | "folderPlus"
  | "flag"
  | "target"
  | "settings"
  | "spinner"
  | "ring"
  | "signal"
  | "paperclip";

const P: Record<IconName, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z"/>',
  project:
    '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  todo:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
  issue: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  more:
    '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash:
    '<path d="M3 6h18M8 6V4h8v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6"/>',
  ai:
    '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  command:
    '<path d="M15 6a3 3 0 1 1 3 3h-3V6ZM9 6a3 3 0 1 0-3 3h3V6ZM9 18a3 3 0 1 1-3-3h3v3ZM15 18a3 3 0 1 0 3-3h-3v3Z"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  folderPlus:
    '<path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/><path d="M12 11v6M9 14h6"/>',
  flag: '<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4 2.1-2.1"/>',
  spinner: '<path d="M21 12a9 9 0 1 1-6.2-8.5"/>',
  ring: '<circle cx="12" cy="12" r="8"/>',
  signal: '<path d="M5 18v-4M12 18v-9M19 18V5"/>',
  paperclip:
    '<path d="M21.4 11.05 12.2 20.3a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.4-2.4l8.5-8.5"/>',
};

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
  fill?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, stroke, fill, className, style }: IconProps) {
  const isAI = name === "ai";
  const sw = isAI ? 0 : 1.5;
  const f = fill ?? (isAI ? "currentColor" : "none");
  const s = isAI ? "none" : stroke ?? "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={f}
      stroke={s}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: P[name] }}
    />
  );
}
