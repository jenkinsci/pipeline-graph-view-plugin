import { describe, expect, it } from "vitest";

import { BuildFlowEdgeModel } from "../model/BuildFlowModel";

/**
 * Pure function matching the useMemo logic in BuildFlow.tsx for focus path.
 * Extracted here for testability.
 */
function computeHighlightedIds(
  hoveredNodeId: string | null,
  edges: BuildFlowEdgeModel[],
  flattenGraph: boolean,
): Set<string> | null {
  if (!hoveredNodeId || flattenGraph) return null;
  const set = new Set<string>([hoveredNodeId]);
  for (const edge of edges) {
    if (edge.from === hoveredNodeId) set.add(edge.to);
    if (edge.to === hoveredNodeId) set.add(edge.from);
  }
  return set;
}

describe("Focus path highlighting", () => {
  const edges: BuildFlowEdgeModel[] = [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "A", to: "D" },
  ];

  it("computes highlighted set from hovered node", () => {
    const result = computeHighlightedIds("B", edges, false);
    expect(result).not.toBeNull();
    // B's upstream (A) and downstream (C)
    expect(result!.has("A")).toBe(true);
    expect(result!.has("B")).toBe(true);
    expect(result!.has("C")).toBe(true);
    // D is not adjacent to B
    expect(result!.has("D")).toBe(false);
  });

  it("includes all neighbors for a root node", () => {
    const result = computeHighlightedIds("A", edges, false);
    expect(result).not.toBeNull();
    expect(result!.has("A")).toBe(true);
    expect(result!.has("B")).toBe(true);
    expect(result!.has("D")).toBe(true);
    // C is not directly connected to A
    expect(result!.has("C")).toBe(false);
  });

  it("returns null when no node is hovered", () => {
    expect(computeHighlightedIds(null, edges, false)).toBeNull();
  });

  it("returns null in flat layout mode", () => {
    expect(computeHighlightedIds("B", edges, true)).toBeNull();
  });

  it("handles leaf node with single edge", () => {
    const result = computeHighlightedIds("C", edges, false);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(2); // C and B
    expect(result!.has("C")).toBe(true);
    expect(result!.has("B")).toBe(true);
  });

  it("handles isolated node with no edges", () => {
    const result = computeHighlightedIds("Z", edges, false);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(1);
    expect(result!.has("Z")).toBe(true);
  });

  it("determines dimmed state for nodes", () => {
    const highlighted = computeHighlightedIds("B", edges, false);
    // D is dimmed (not in highlighted set)
    expect(highlighted != null && !highlighted.has("D")).toBe(true);
    // B is not dimmed
    expect(highlighted != null && !highlighted.has("B")).toBe(false);
  });

  it("determines dimmed state for edges", () => {
    const highlighted = computeHighlightedIds("B", edges, false);
    // Edge A->B: both endpoints highlighted -> not dimmed
    const edgeAB =
      highlighted != null && !(highlighted.has("A") && highlighted.has("B"));
    expect(edgeAB).toBe(false);

    // Edge A->D: D is not highlighted -> dimmed
    const edgeAD =
      highlighted != null && !(highlighted.has("A") && highlighted.has("D"));
    expect(edgeAD).toBe(true);
  });
});
