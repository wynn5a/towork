import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Icon, type IconName } from "../lib/icons";
import { PRIORITY_META, STATUS_META } from "../lib/derive";
import type { Assignee, Priority, Status } from "../lib/types";
import { Tooltip } from "./Tooltip";

/* ------------------------------- avatar ------------------------------- */
export function Avatar({
  assignee,
  size = "sm",
}: {
  assignee: Assignee;
  size?: "xs" | "sm" | "" | "lg";
}) {
  const cls = `avatar ${assignee === "AI" ? "ai" : "user"}${size ? " " + size : ""}`;
  if (assignee === "AI") {
    return (
      <span className={cls} title="Claude">
        <Icon name="ai" size={size === "lg" ? 17 : 13} />
      </span>
    );
  }
  return (
    <span className={cls} title="You">
      <Icon name="user" size={size === "xs" ? 10 : 12} />
    </span>
  );
}

/* -------------------------------- pills ------------------------------- */
function pillStyle(hue: string) {
  return {
    background: `color-mix(in srgb, ${hue} 14%, transparent)`,
    color: hue,
  };
}

export function StatusPill({ status }: { status: Status }) {
  const d = STATUS_META[status];
  return (
    <span className="pill" style={pillStyle(d.hue)}>
      <span className="pdot" style={{ background: d.hue }} />
      {d.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const d = PRIORITY_META[priority];
  return (
    <span className="pill" style={pillStyle(d.hue)}>
      <span className="pdot" style={{ background: d.hue }} />
      {d.label}
    </span>
  );
}

export function PrioritySignal({ priority }: { priority: Priority }) {
  const d = PRIORITY_META[priority];
  return (
    <span className="row-pri" title={`${d.label} priority`}>
      <Icon name="signal" size={14} stroke={d.hue} />
    </span>
  );
}

/* ------------------------------ count badge --------------------------- */
export function Count({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <span className={`count${accent ? " accent" : ""}`}>{children}</span>;
}

/* --------------------------------- kbd -------------------------------- */
export function Kbd({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <span className={`kbd${dark ? " dark" : ""}`}>{children}</span>;
}

/* ------------------------------ icon button --------------------------- */
export function IconButton({
  name,
  size = 16,
  title,
  onClick,
  className = "",
}: {
  name: IconName;
  size?: number;
  title?: string;
  onClick?: (e: ReactMouseEvent) => void;
  className?: string;
}) {
  const btn = (
    <button className={`icon-btn ${className}`} onClick={onClick}>
      <Icon name={name} size={size} />
    </button>
  );
  return title ? <Tooltip label={title}>{btn}</Tooltip> : btn;
}

/* ------------------------------ empty state --------------------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="empty" style={style}>
      <span className="em-ic">
        <Icon name={icon} size={24} />
      </span>
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/* -------------------------------- toggle ------------------------------ */
export function Toggle({ on }: { on: boolean }) {
  return <span className={`toggle${on ? " on" : ""}`} />;
}

/* ----------------------------- ai working ----------------------------- */
export function AiWorking() {
  return (
    <span className="ai-working">
      <Icon name="spinner" size={11} className="spin" />
      Claude
    </span>
  );
}
