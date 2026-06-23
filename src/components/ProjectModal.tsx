import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { createProject, updateProject } from "../lib/tauri";
import { Icon } from "../lib/icons";
import { IconButton, Kbd } from "./ui";
import { useFocusTrap } from "../lib/useFocusTrap";

export function ProjectModal({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose: () => void;
}) {
  const { projectById, reload, toast } = useStore();
  const { runMutation } = useItemActions();
  const ui = useUI();
  const navigate = useNavigate();
  const existing = projectId ? projectById(projectId) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [desc, setDesc] = useState(existing?.description ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(dialogRef);

  // The trap moves focus to the first focusable control (the close button) on
  // open; override it here so the name field is focused for typing.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function save() {
    const n = name.trim();
    if (!n) return;
    if (existing) {
      const ok = await runMutation("Couldn’t save project", async () => {
        await updateProject(existing.id, n, desc.trim());
        toast("Saved", n);
        await reload();
      });
      // Keep the dialog open on failure so the user can retry.
      if (ok) onClose();
    } else {
      let created: string | null = null;
      const ok = await runMutation("Couldn’t create project", async () => {
        const p = await createProject(n, desc.trim() || undefined);
        created = p.id;
        toast("Project created", n, "green");
        await reload();
      });
      if (!ok) return;
      onClose();
      if (created) navigate(`/project/${created}`);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ width: 460 }}
      >
        <div className="dlg-head">
          <span className="dlg-ic">
            <Icon name={existing ? "edit" : "folderPlus"} size={16} />
          </span>
          <div className="dh-text">
            <div className="dlg-title" id={titleId}>{existing ? "Edit project" : "New project"}</div>
            <div className="dlg-sub">
              {existing
                ? "Update name and description."
                : "Group related todos and issues. Claude can read and write to it over MCP."}
            </div>
          </div>
          <IconButton name="x" size={15} onClick={onClose} />
        </div>

        <div className="dlg-body">
          <div className="field-group">
            <label>
              Name <span className="req">*</span>
            </label>
            <input
              ref={nameRef}
              className="input"
              placeholder="e.g. Mobile app"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Description</label>
            <textarea
              className="input"
              placeholder="What is this project about?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="dlg-foot">
          {existing && (
            <button
              className="btn-chip danger ff-left"
              onClick={() => {
                onClose();
                ui.confirmDeleteProject(existing);
              }}
            >
              <Icon name="trash" size={13} />
              Delete project
            </button>
          )}
          <button className="btn-chip" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!name.trim()} onClick={save}>
            {existing ? "Save" : "Create project"}
            <Kbd keys={["⌘", "↵"]} size="sm" variant="inv" />
          </button>
        </div>
      </div>
    </div>
  );
}
