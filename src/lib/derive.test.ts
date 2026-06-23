import { describe, it, expect } from "vitest";
import { buildSeqMap } from "./derive";
import type { Item, Project } from "./types";

function project(id: string, name: string): Project {
  return { id, name, description: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
}

function item(id: string, project_id: string, created_at: string): Item {
  return {
    id,
    project_id,
    title: id,
    description: null,
    status: "Open",
    priority: "Medium",
    assignee: "User",
    created_at,
    updated_at: created_at,
    kind: "todo",
  };
}

describe("buildSeqMap", () => {
  it("numbers items by creation order", () => {
    const p = project("p1", "Towork Core");
    const a = item("id-a", "p1", "2026-01-01T00:00:00Z");
    const b = item("id-b", "p1", "2026-01-02T00:00:00Z");
    const map = buildSeqMap([p], [b, a]);
    expect(map.get("id-a")).toBe("TOW-1");
    expect(map.get("id-b")).toBe("TOW-2");
  });

  it("is deterministic when two items share a created_at, regardless of input order", () => {
    const p = project("p1", "Towork Core");
    const ts = "2026-01-01T00:00:00Z";
    // Same timestamp; the lexicographically smaller id must be numbered first.
    const a = item("aaa", "p1", ts);
    const z = item("zzz", "p1", ts);

    const forward = buildSeqMap([p], [a, z]);
    const reversed = buildSeqMap([p], [z, a]);

    // Smaller id ("aaa") wins -1 in both orderings; numbering does not depend
    // on the input array order.
    expect(forward.get("aaa")).toBe("TOW-1");
    expect(forward.get("zzz")).toBe("TOW-2");
    expect(reversed.get("aaa")).toBe("TOW-1");
    expect(reversed.get("zzz")).toBe("TOW-2");
    expect(forward.get("aaa")).toBe(reversed.get("aaa"));
    expect(forward.get("zzz")).toBe(reversed.get("zzz"));
  });
});
