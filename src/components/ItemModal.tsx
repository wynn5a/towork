import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Assignee, ItemKind, Priority, Status } from "../lib/types";
import { useStore } from "../lib/store";
import {
  createIssue,
  createTodo,
  deleteIssue,
  deleteTodo,
  updateIssue,
  updateTodo,
} from "../lib/tauri";
import { PRIORITY_META, STATUS_META, projectPrefix } from "../lib/derive";
import { Icon } from "../lib/icons";
import { Avatar, IconButton, Kbd, Toggle } from "./ui";
import { Tooltip } from "./Tooltip";
import { Menu, anchorMenu, type MenuItem, type MenuPos } from "./Menu";
import { ConfirmDialog } from "./ConfirmDialog";
import { ActivityTimeline } from "./ActivityTimeline";

export interface ItemModalConfig {
  kind: ItemKind;
  projectId: string;
  itemId?: string;
  /** Prefill for a new item, e.g. when a quick-add input hands off a long title. */
  draft?: { title?: string; description?: string; priority?: Priority; assignee?: Assignee };
}

type PropKey = "status" | "priority" | "assignee";

export function ItemModal({
  config,
  onClose,
}: {
  config: ItemModalConfig;
  onClose: () => void;
}) {
  const { items, projectById, reload, toast, seqId } = useStore();
  const existing = config.itemId ? items.find((i) => i.id === config.itemId) : undefined;
  const project = projectById(config.projectId);

  const [title, setTitle] = useState(existing?.title ?? config.draft?.title ?? "");
  const [desc, setDesc] = useState(existing?.description ?? config.draft?.description ?? "");
  const [status, setStatus] = useState<Status>(existing?.status ?? "Open");
  const [priority, setPriority] = useState<Priority>(
    existing?.priority ?? config.draft?.priority ?? "Medium"
  );
  const [assignee, setAssignee] = useState<Assignee>(
    existing?.assignee ?? config.draft?.assignee ?? "User"
  );
  const [createMore, setCreateMore] = useState(false);
  const [menu, setMenu] = useState<{ key: PropKey; pos: MenuPos } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // On handoff from a quick-add input the typed text lands in the description,
    // so keep the caret there (at the end) where the user was typing. Otherwise
    // focus the title.
    const handoff = !existing && !!config.draft?.description && !config.draft?.title;
    const el = handoff ? descRef.current : titleRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  const kind = existing?.kind ?? config.kind;
  const isIssue = kind === "issue";
  const crumb = existing ? seqId(existing.id) : `New ${kind}`;
  const prefix = project ? projectPrefix(project.name) : "";

  function resetDraft() {
    setTitle("");
    setDesc("");
    setStatus("Open");
    setPriority("Medium");
    setAssignee("User");
  }

  async function save() {
    const t = title.trim();
    if (!t) return;
    const fields = { title: t, description: desc.trim(), status, priority, assignee };
    if (existing) {
      if (existing.kind === "todo") await updateTodo(existing.id, fields);
      else await updateIssue(existing.id, fields);
      toast("Saved", `${seqId(existing.id)} · ${t}`);
      await reload();
      onClose();
    } else {
      const create = isIssue ? createIssue : createTodo;
      await create(config.projectId, t, desc.trim() || undefined, priority, assignee);
      toast(isIssue ? "Issue created" : "Todo created", t, "green");
      await reload();
      if (createMore) resetDraft();
      else onClose();
    }
  }

  async function remove() {
    if (!existing) return;
    if (existing.kind === "todo") await deleteTodo(existing.id);
    else await deleteIssue(existing.id);
    toast("Deleted", `${seqId(existing.id)} · ${existing.title}`, "red");
    await reload();
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // While the delete confirmation is up, let it handle Escape (cancel)
        // rather than closing the whole modal.
        if (confirmingDelete) return;
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  function openPropMenu(e: ReactMouseEvent, key: PropKey) {
    e.stopPropagation();
    setMenu({ key, pos: anchorMenu(e.currentTarget as HTMLElement, 170) });
  }

  function menuItems(key: PropKey): MenuItem[] {
    if (key === "status") {
      return (["Open", "Done"] as Status[]).map((v) => ({
        key: v,
        label: STATUS_META[v].label,
        lead: <span className="pdot" style={{ background: STATUS_META[v].hue }} />,
        selected: status === v,
        onSelect: () => setStatus(v),
      }));
    }
    if (key === "priority") {
      return (["High", "Medium", "Low"] as Priority[]).map((v) => ({
        key: v,
        label: PRIORITY_META[v].label,
        lead: <span className="pdot" style={{ background: PRIORITY_META[v].hue }} />,
        selected: priority === v,
        onSelect: () => setPriority(v),
      }));
    }
    return (["User", "AI"] as Assignee[]).map((v) => ({
      key: v,
      label: v === "AI" ? "Claude" : "You",
      lead: <Avatar assignee={v} size="xs" />,
      selected: assignee === v,
      onSelect: () => setAssignee(v),
    }));
  }

  const propLead = (key: PropKey) => {
    if (key === "status") return <Icon name="ring" size={14} stroke={STATUS_META[status].hue} />;
    if (key === "priority") return <Icon name="signal" size={14} stroke={PRIORITY_META[priority].hue} />;
    return <Avatar assignee={assignee} size="xs" />;
  };
  const propLabel = (key: PropKey) => {
    if (key === "status") return STATUS_META[status].label;
    if (key === "priority") return PRIORITY_META[priority].label;
    return assignee === "AI" ? "Claude" : "You";
  };

  return (
    <>
      <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="dialog issue-dialog" role="dialog" aria-modal="true">
        <div className="idlg-head">
          <span className="idlg-crumb">
            <span className="idlg-badge">
              <Icon name="project" size={11} stroke="#fff" />
            </span>
            {prefix}
          </span>
          <span className="idlg-arrow">
            <Icon name="chevron" size={13} />
          </span>
          <span className="idlg-context">{crumb}</span>
          <div className="idlg-head-actions">
            {existing && (
              <IconButton
                name="activity"
                size={16}
                title={showActivity ? "Hide activity" : "Show activity"}
                className={showActivity ? "active" : ""}
                onClick={() => setShowActivity((v) => !v)}
              />
            )}
            <IconButton name="x" size={16} title="Close" onClick={onClose} />
          </div>
        </div>

        <div className="idlg-body">
          <input
            ref={titleRef}
            className="idlg-title"
            placeholder={isIssue ? "Issue title" : "Todo title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (document.getElementById("f-desc") as HTMLTextAreaElement)?.focus();
              }
            }}
          />
          <textarea
            ref={descRef}
            id="f-desc"
            className="idlg-desc"
            placeholder="Add description…"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          {existing && showActivity && (
            <div className="idlg-activity">
              <div className="section-label">Activity</div>
              <ActivityTimeline
                itemId={existing.id}
                itemType={existing.kind === "todo" ? "Todo" : "Issue"}
              />
            </div>
          )}
        </div>

        <div className="idlg-props">
          {(["status", "priority", "assignee"] as PropKey[]).map((key) => (
            <button key={key} className="prop-pill" onClick={(e) => openPropMenu(e, key)}>
              {propLead(key)}
              <span>{propLabel(key)}</span>
            </button>
          ))}
          {existing && (
            <Tooltip label="Delete">
              <button
                className="btn-ghost danger"
                style={{ marginLeft: "auto" }}
                onClick={() => setConfirmingDelete(true)}
              >
                <Icon name="trash" size={14} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="idlg-foot">
          <Tooltip label="Attach (coming soon)">
            <button className="idlg-attach">
              <Icon name="paperclip" size={15} />
            </button>
          </Tooltip>
          <div className="idlg-foot-right">
            {!existing && (
              <button className="create-more" onClick={() => setCreateMore((v) => !v)}>
                <Toggle on={createMore} />
                Create more
              </button>
            )}
            <button className="btn-primary" disabled={!title.trim()} onClick={save}>
              {existing ? "Save changes" : isIssue ? "Create issue" : "Create todo"}
              <Kbd dark>⌘↵</Kbd>
            </button>
          </div>
        </div>
      </div>

      {menu && (
        <Menu pos={menu.pos} items={menuItems(menu.key)} onClose={() => setMenu(null)} />
      )}
      </div>
      {existing && confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${seqId(existing.id)}?`}
          message={`“${existing.title}” will be permanently removed. This can’t be undone.`}
          confirmLabel="Delete"
          onConfirm={remove}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
