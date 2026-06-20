import { useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { ItemRow, SectionLabel } from "../components/items";
import { Count, EmptyState, IconButton } from "../components/ui";
import { Icon } from "../lib/icons";

export function SearchPage() {
  const { items } = useStore();
  const ui = useUI();
  const { cycleStatus } = useItemActions();
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matched = useMemo(() => {
    if (!q) return [];
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q)
    );
  }, [items, q]);

  const todos = matched.filter((m) => m.kind === "todo");
  const issues = matched.filter((m) => m.kind === "issue");

  return (
    <div className="view-pad">
      <div className="search-hero">
        <div className={`search-big${focus ? " focus" : ""}`}>
          <Icon name="search" size={18} stroke="var(--text-3)" />
          <input
            ref={inputRef}
            placeholder="Search todos and issues across all projects…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
          />
          <IconButton
            name="x"
            size={14}
            title="Clear"
            className={`clear${q ? " show" : ""}`}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          />
        </div>

        {!q ? (
          <EmptyState
            icon="search"
            title="Search everything"
            description="Find any todo or issue by title or description across every project."
            style={{ paddingTop: 48 }}
          />
        ) : matched.length === 0 ? (
          <EmptyState
            icon="search"
            title={`No matches for “${query}”`}
            description="Try a different keyword."
            style={{ paddingTop: 48 }}
          />
        ) : (
          <>
            <div className="search-summary">
              {matched.length} result{matched.length === 1 ? "" : "s"}
            </div>
            {todos.length > 0 && (
              <>
                <SectionLabel>
                  Todos <Count>{todos.length}</Count>
                </SectionLabel>
                <div className="item-list">
                  {todos.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      showProject
                      onToggle={cycleStatus}
                      onOpen={() =>
                        ui.openItemModal({ kind: "todo", projectId: it.project_id, itemId: it.id })
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {issues.length > 0 && (
              <>
                <SectionLabel>
                  Issues <Count>{issues.length}</Count>
                </SectionLabel>
                <div className="item-list">
                  {issues.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      showProject
                      onToggle={cycleStatus}
                      onOpen={() =>
                        ui.openItemModal({ kind: "issue", projectId: it.project_id, itemId: it.id })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
