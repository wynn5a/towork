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
import { ItemModal, type ItemModalConfig } from "../components/ItemModal";
import { ProjectModal } from "../components/ProjectModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CommandPalette } from "../components/CommandPalette";

interface UICtx {
  openCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openProjectModal: (projectId?: string) => void;
  openItemModal: (config: ItemModalConfig) => void;
  confirmDeleteProject: (project: Project) => void;
  isAnyOverlayOpen: () => boolean;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const { reload, toast } = useStore();
  const navigate = useNavigate();

  const [palette, setPalette] = useState(false);
  const [projectModal, setProjectModal] = useState<{ projectId?: string } | null>(null);
  const [itemModal, setItemModal] = useState<ItemModalConfig | null>(null);
  const [confirm, setConfirm] = useState<Project | null>(null);

  const confirmDeleteProject = useCallback((project: Project) => setConfirm(project), []);

  const value = useMemo<UICtx>(
    () => ({
      openCommandPalette: () => setPalette(true),
      toggleCommandPalette: () => setPalette((v) => !v),
      openProjectModal: (projectId?: string) => setProjectModal({ projectId }),
      openItemModal: (config) => setItemModal(config),
      confirmDeleteProject,
      isAnyOverlayOpen: () => palette || !!projectModal || !!itemModal || !!confirm,
    }),
    [confirmDeleteProject, palette, projectModal, itemModal, confirm]
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
      {confirm && (
        <ConfirmDialog
          title={`Delete “${confirm.name}”?`}
          message="The project and all of its todos and issues will be removed. This cannot be undone."
          confirmLabel="Delete project"
          onConfirm={async () => {
            const id = confirm.id;
            await apiDeleteProject(id);
            toast("Project deleted", confirm.name, "red");
            await reload();
            navigate("/projects");
          }}
          onClose={() => setConfirm(null)}
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
