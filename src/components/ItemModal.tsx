import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Assignee, ItemKind, Priority, Status } from "../lib/types";
import { useStore } from "../lib/store";
import { useFocusTrap } from "../lib/useFocusTrap";
import {
  createIssue,
  createTodo,
  deleteIssue,
  deleteTodo,
  updateIssue,
  updateTodo,
} from "../lib/tauri";
import { useItemActions } from "../lib/actions";
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
  const { runMutation } = useItemActions();
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
  // Set when a field the user has edited changed underneath us (e.g. the AI
  // edited the same item over MCP). We don't silently clobber their in-progress
  // work; instead we surface a non-destructive "changed elsewhere" banner.
  const [conflict, setConflict] = useState(false);

  // The values each field was last synced *from* — i.e. what `existing` held the
  // last time we reconciled. A field is "dirty" when its current local state
  // differs from this. We compare the *external* value against this snapshot to
  // tell an untouched-field resync apart from a genuine conflict, and refs (not
  // state) keep the live-sync effect from re-running on every keystroke.
  const synced = useRef({
    title: existing?.title ?? config.draft?.title ?? "",
    description: existing?.description ?? config.draft?.description ?? "",
    status: existing?.status ?? ("Open" as Status),
    priority: existing?.priority ?? config.draft?.priority ?? ("Medium" as Priority),
    assignee: existing?.assignee ?? config.draft?.assignee ?? ("User" as Assignee),
  });

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  // Trap Tab focus within the dialog and restore focus on close. The mount
  // effect below re-focuses the title/description (the trap's initial focus is
  // overridden), so editing starts in the right field.
  useFocusTrap(dialogRef);
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

  // Auto-grow the description to fit its content (capped by the CSS max-height,
  // past which it scrolls internally). Runs on mount — including with existing
  // long content or a quick-add prefill — and on every edit.
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [desc]);

  // Live-sync to external edits. When the item changes underneath the open modal
  // (the AI edits it over MCP, the store reloads on `towork:changed`), `existing`
  // recomputes to the new values. For each field the user hasn't touched, adopt
  // the new value silently so the editor reflects the AI's change in place. For a
  // field the user *has* edited, leave their work alone but flag a conflict so we
  // can warn rather than have Save quietly clobber the AI. Keyed on `updated_at`
  // (and id) so it fires once per external change, not on every keystroke.
  useEffect(() => {
    if (!existing) return;
    const s = synced.current;
    const ext = {
      title: existing.title,
      description: existing.description ?? "",
      status: existing.status,
      priority: existing.priority,
      assignee: existing.assignee,
    };
    let conflicted = false;
    if (ext.title !== s.title) {
      if (title === s.title) { setTitle(ext.title); s.title = ext.title; }
      else conflicted = true;
    }
    if (ext.description !== s.description) {
      if (desc === s.description) { setDesc(ext.description); s.description = ext.description; }
      else conflicted = true;
    }
    if (ext.status !== s.status) {
      if (status === s.status) { setStatus(ext.status); s.status = ext.status; }
      else conflicted = true;
    }
    if (ext.priority !== s.priority) {
      if (priority === s.priority) { setPriority(ext.priority); s.priority = ext.priority; }
      else conflicted = true;
    }
    if (ext.assignee !== s.assignee) {
      if (assignee === s.assignee) { setAssignee(ext.assignee); s.assignee = ext.assignee; }
      else conflicted = true;
    }
    if (conflicted) setConflict(true);
    // Intentionally keyed on the item identity + updated_at, not the live form
    // state — we want this to run once per *external* change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.updated_at]);

  // Pull the current external values into the form, discarding the user's
  // in-progress edits. Invoked only when they explicitly click "Reload".
  function pullExternal() {
    if (!existing) return;
    const ext = {
      title: existing.title,
      description: existing.description ?? "",
      status: existing.status,
      priority: existing.priority,
      assignee: existing.assignee,
    };
    setTitle(ext.title);
    setDesc(ext.description);
    setStatus(ext.status);
    setPriority(ext.priority);
    setAssignee(ext.assignee);
    synced.current = { ...ext };
    setConflict(false);
  }

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
      // Did this save change the status? Compare against the last-synced baseline
      // (what the item was before this save, accounting for any external value the
      // live-sync effect silently adopted) — captured before we overwrite it below.
      const statusChanged = status !== synced.current.status;
      const ok = await runMutation("Couldn’t save changes", async () => {
        if (existing.kind === "todo") await updateTodo(existing.id, fields);
        else await updateIssue(existing.id, fields);
        // What we just wrote is the new baseline, so the post-save reload (which
        // bumps updated_at) re-syncs cleanly instead of re-flagging a conflict.
        synced.current = { ...fields };
        // One toast per save: a status-specific toast (matching cycleStatus's
        // wording/hue) when the status changed, otherwise the generic "Saved".
        const body = `${seqId(existing.id)} · ${t}`;
        if (statusChanged) {
          if (status === "In Progress") toast("In progress", body, "accent");
          else if (status === "Done") toast("Marked done", body, "green");
          else toast("Reopened", body, "green");
        } else {
          toast("Saved", body);
        }
        await reload();
      });
      // Keep the dialog open on failure so the user can retry without losing edits.
      if (ok) onClose();
    } else {
      const ok = await runMutation(isIssue ? "Couldn’t create issue" : "Couldn’t create todo", async () => {
        const create = isIssue ? createIssue : createTodo;
        await create(config.projectId, t, desc.trim() || undefined, status, priority, assignee);
        toast(isIssue ? "Issue created" : "Todo created", t, "green");
        await reload();
      });
      if (!ok) return;
      if (createMore) resetDraft();
      else onClose();
    }
  }

  async function remove() {
    if (!existing) return;
    const ok = await runMutation("Couldn’t delete", async () => {
      if (existing.kind === "todo") await deleteTodo(existing.id);
      else await deleteIssue(existing.id);
      toast("Deleted", `${seqId(existing.id)} · ${existing.title}`, "red");
      await reload();
    });
    if (ok) onClose();
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
      return (["Open", "In Progress", "Done"] as Status[]).map((v) => ({
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
        <div
          ref={dialogRef}
          className="dialog issue-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          tabIndex={-1}
        >
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
          <span className="idlg-context" id={labelId}>{crumb}</span>
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
          {existing && conflict && (
            <div className="idlg-conflict" role="status">
              <Icon name="activity" size={14} stroke="var(--amber)" />
              <span>This item was changed elsewhere.</span>
              <button type="button" className="idlg-conflict-action" onClick={pullExternal}>
                Reload
              </button>
            </div>
          )}
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
              <Kbd keys={["⌘", "↵"]} size="sm" variant="inv" />
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
