import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { getActivity, listIssues, listProjects, listTodos } from "./tauri";
import type { ActivityLog, Issue, Item, Project, Todo } from "./types";
import { buildSeqMap, tag } from "./derive";

export type ToastHue = "accent" | "green" | "red";
export interface Toast {
  id: number;
  title: string;
  body?: string;
  hue: ToastHue;
  /** Set once the toast is on its way out, so the `Toaster` renders the
   *  slide-out (`.toast.out`) animation. The row isn't removed from the list
   *  until that animation ends (`removeToast`), keeping the exit animated. */
  leaving?: boolean;
}

interface StoreCtx {
  projects: Project[];
  todos: Todo[];
  issues: Issue[];
  items: Item[];
  /** Claude's most recent actions (newest first, capped), kept in sync with
   *  `items`/`seqId` because they all refresh in the same `reload()`. */
  recentAiActivity: ActivityLog[];
  /** Item ids the AI teammate has *just* mutated, each mapped to a token that
   *  bumps on every fresh touch. A row reads `aiTouched[item.id]` to play (and,
   *  via the token as a key, restart) its purple acknowledgement; entries clear
   *  themselves ~1.8s after the action so the cue recedes. Empty for GUI edits. */
  aiTouched: Record<string, number>;
  loading: boolean;
  reload: () => Promise<void>;
  projectById: (id: string | null | undefined) => Project | undefined;
  itemsForProject: (id: string) => Item[];
  seqId: (itemId: string) => string;
  toasts: Toast[];
  toast: (title: string, body?: string, hue?: ToastHue) => void;
  /** Begin a toast's exit: flips it to a leaving state so the slide-out
   *  animation plays. Called by the auto-dismiss timer and by manual dismiss. */
  dismissToast: (id: number) => void;
  /** Actually drop a toast from the list — fired by `Toaster` once the
   *  slide-out animation ends. Separated from `dismissToast` so the exit stays
   *  animated rather than the row vanishing synchronously. */
  removeToast: (id: number) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  // AI-only activity, fetched actor-scoped so a burst of User-actor GUI rows can
  // never push AI rows out of view (an actor-agnostic recent window could fill
  // with User rows and hide all AI activity — the bug this fixes). The sidebar
  // strip and the per-item "AI touched" wash both source from this. The full,
  // actor-agnostic activity feed is fetched independently by ActivityTimeline.
  const [aiActivity, setAiActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const [aiTouched, setAiTouched] = useState<Record<string, number>>({});
  // Activity ids already reacted to. `null` = uninitialised, so the very first
  // load registers a baseline and stays quiet (no flashing the whole history).
  const seenAiIds = useRef<Set<string> | null>(null);
  const aiClearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const reload = useCallback(async () => {
    const [p, t, i, ai] = await Promise.all([
      listProjects(),
      listTodos(),
      listIssues(),
      // AI-presence chrome; never let it fail the core data load. Fetched
      // actor-scoped (actor: "AI") so a burst of User-actor GUI rows can't
      // starve it — an actor-agnostic recent window could fill with User rows
      // and hide all AI activity. 30 comfortably covers the sidebar's
      // slice(0,3) and the per-item "AI touched" wash diff, and stays bounded
      // so an ever-growing log isn't shipped in full on every change.
      getActivity({ actor: "AI", limit: 30 }).catch(() => [] as ActivityLog[]),
    ]);
    setProjects(p);
    setTodos(t);
    setIssues(i);
    setAiActivity(ai);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch((e) => {
      console.error("Failed to load data", e);
      setLoading(false);
    });
  }, [reload]);

  // Live-refresh when the embedded MCP server reports a change (Claude acting).
  useEffect(() => {
    const unlisten = listen("towork:changed", () => {
      reload().catch(() => {});
    });
    return () => {
      unlisten.then((off) => off()).catch(() => {});
    };
  }, [reload]);

  const items = useMemo<Item[]>(
    () => [...todos.map((t) => tag("todo", t)), ...issues.map((i) => tag("issue", i))],
    [todos, issues]
  );

  const seqMap = useMemo(() => buildSeqMap(projects, items), [projects, items]);

  // Newest-first AI actions for the Home strip. Sourced from the actor-scoped
  // `aiActivity` window (refreshed in the same reload() as items) so a burst of
  // User-actor GUI rows can't starve it. Already AI-only from the query.
  const recentAiActivity = useMemo(
    () => aiActivity.slice(0, 3),
    [aiActivity],
  );

  // Flag items the AI teammate just touched so their rows can acknowledge the
  // change in place (the live counterpart to the sidebar pulse). Diffs the
  // actor-scoped AI window against what we've already seen; only genuinely new
  // actions light up, and only AI ones — GUI (actor: User) edits never flash
  // (they're not in this window). Each touch auto-clears after ~1.8s so the cue
  // recedes on its own.
  useEffect(() => {
    const aiRows = aiActivity;
    if (seenAiIds.current === null) {
      seenAiIds.current = new Set(aiRows.map((a) => a.id)); // baseline — stay quiet
      return;
    }
    const seen = seenAiIds.current;
    const touched: string[] = [];
    for (const a of aiRows) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      if (a.item_id) touched.push(a.item_id);
    }
    if (touched.length === 0) return;
    // The AI window is capped (30); keep `seen` from growing without bound
    // across a long session while still covering the whole current window (so a
    // pruned id can never resurface as "fresh" and re-flash).
    if (seen.size > 400) seenAiIds.current = new Set(aiRows.map((a) => a.id));

    setAiTouched((prev) => {
      const next = { ...prev };
      for (const id of touched) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
    const timers = aiClearTimers.current;
    for (const id of touched) {
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          setAiTouched((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 1800),
      );
    }
  }, [aiActivity]);

  // Drop any pending acknowledgement timers on unmount.
  useEffect(() => {
    const timers = aiClearTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  // Flip a toast to its leaving state (idempotent) so the `Toaster` plays the
  // slide-out animation; the row is removed later in `removeToast` once that
  // animation ends. Both the auto-dismiss timer and manual dismiss call this.
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((x) => (x.id === id && !x.leaving ? { ...x, leaving: true } : x))
    );
  }, []);

  // Drop a toast from the list. Fired by `Toaster.onAnimationEnd` after the
  // slide-out finishes (guarded by id presence so a double-end can't error).
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, body?: string, hue: ToastHue = "accent") => {
      const id = ++toastSeq.current;
      setToasts((prev) => [...prev, { id, title, body, hue }]);
      setTimeout(() => dismissToast(id), 2800);
    },
    [dismissToast]
  );

  const value = useMemo<StoreCtx>(
    () => ({
      projects,
      todos,
      issues,
      items,
      recentAiActivity,
      aiTouched,
      loading,
      reload,
      projectById: (id) => projects.find((p) => p.id === id),
      itemsForProject: (id) => items.filter((it) => it.project_id === id),
      seqId: (itemId) => seqMap.get(itemId) ?? "",
      toasts,
      toast,
      dismissToast,
      removeToast,
    }),
    [projects, todos, issues, items, recentAiActivity, aiTouched, loading, reload, seqMap, toasts, toast, dismissToast, removeToast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
