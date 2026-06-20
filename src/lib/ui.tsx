import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "./store";
import { deleteProject as apiDeleteProject } from "./tauri";
import type { Project } from "./types";
import type { IconName } from "./icons";
import { ItemModal, type ItemModalConfig } from "../components/ItemModal";
import { ProjectModal } from "../components/ProjectModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CommandPalette } from "../components/CommandPalette";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "accent";
  icon?: IconName;
  onConfirm: () => void | Promise<void>;
};

interface UICtx {
  openCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openProjectModal: (projectId?: string) => void;
  openItemModal: (config: ItemModalConfig) => void;
  confirmDeleteProject: (project: Project) => void;
  confirm: (opts: ConfirmOptions) => void;
  isAnyOverlayOpen: () => boolean;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const { reload, toast } = useStore();
  const navigate = useNavigate();

  const [palette, setPalette] = useState(false);
  const [projectModal, setProjectModal] = useState<{ projectId?: string } | null>(null);
  const [itemModal, setItemModal] = useState<ItemModalConfig | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);

  const confirmDeleteProject = useCallback((project: Project) => setProjectToDelete(project), []);
  const confirm = useCallback((opts: ConfirmOptions) => setConfirmOpts(opts), []);

  const value = useMemo<UICtx>(
    () => ({
      openCommandPalette: () => setPalette(true),
      toggleCommandPalette: () => setPalette((v) => !v),
      openProjectModal: (projectId?: string) => setProjectModal({ projectId }),
      openItemModal: (config) => setItemModal(config),
      confirmDeleteProject,
      confirm,
      isAnyOverlayOpen: () =>
        palette || !!projectModal || !!itemModal || !!projectToDelete || !!confirmOpts,
    }),
    [confirmDeleteProject, confirm, palette, projectModal, itemModal, projectToDelete, confirmOpts]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      {projectModal && (
        <ProjectModal
          projectId={projectModal.projectId}
          onClose={() => setProjectModal(null)}
        />
      )}
      {itemModal && <ItemModal config={itemModal} onClose={() => setItemModal(null)} />}
      {projectToDelete && (
        <ConfirmDialog
          title={`Delete “${projectToDelete.name}”?`}
          message="The project and all of its todos and issues will be removed. This cannot be undone."
          confirmLabel="Delete project"
          onConfirm={async () => {
            const id = projectToDelete.id;
            await apiDeleteProject(id);
            toast("Project deleted", projectToDelete.name, "red");
            await reload();
            navigate("/projects");
          }}
          onClose={() => setProjectToDelete(null)}
        />
      )}
      {confirmOpts && (
        <ConfirmDialog
          title={confirmOpts.title}
          message={confirmOpts.message}
          confirmLabel={confirmOpts.confirmLabel}
          tone={confirmOpts.tone}
          icon={confirmOpts.icon}
          onConfirm={() => confirmOpts.onConfirm()}
          onClose={() => setConfirmOpts(null)}
        />
      )}
    </Ctx.Provider>
  );
}

export function useUI(): UICtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
