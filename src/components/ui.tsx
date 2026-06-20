import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Icon, type IconName } from "../lib/icons";
import { PRIORITY_META, STATUS_META } from "../lib/derive";
import type { Assignee, Priority, Status } from "../lib/types";
import { Tooltip } from "./Tooltip";

/* ------------------------------- avatar ------------------------------- */
export function Avatar({
  assignee,
  size = "sm",
  decorative = false,
}: {
  assignee: Assignee;
  size?: "xs" | "sm" | "" | "lg";
  /** Purely decorative (e.g. a leading gutter mark): hidden from assistive tech
   *  and tooltip-free, so it doesn't add redundant "Claude"/"You" announcements. */
  decorative?: boolean;
}) {
  const isAI = assignee === "AI";
  const cls = `avatar ${isAI ? "ai" : "user"}${size ? " " + size : ""}`;
  const icon = (
    <Icon
      name={isAI ? "ai" : "user"}
      size={isAI ? (size === "lg" ? 17 : 13) : size === "xs" ? 10 : 12}
    />
  );
  if (decorative) {
    return (
      <span className={cls} aria-hidden>
        {icon}
      </span>
    );
  }
  return (
    <span className={cls} title={isAI ? "Claude" : "You"}>
      {icon}
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
/* One physical key per <kbd> cap. Pass a single key as a string, or a chord as
 * an array (rendered as a row of caps inside .keys). `variant="inv"` is the
 * white-on-color cap used on primary/danger buttons. */
export function Kbd({
  keys,
  size,
  variant,
}: {
  keys: string | string[];
  size?: "sm" | "lg";
  variant?: "ghost" | "inv";
}) {
  const arr = Array.isArray(keys) ? keys : [keys];
  const cls = [size, variant].filter(Boolean).join(" ");
  const caps = arr.map((k, i) => (
    <kbd key={i} className={cls || undefined}>
      {k}
    </kbd>
  ));
  return arr.length > 1 ? <span className="keys">{caps}</span> : <>{caps}</>;
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
