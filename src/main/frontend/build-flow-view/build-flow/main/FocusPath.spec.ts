import { describe, expect, it } from "vitest";

import { BuildFlowEdgeModel } from "../model/BuildFlowModel";
import { computeFullPath } from "./BuildFlowUtils";

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

describe("computeFullPath - transitive focus", () => {
  // Linear chain: A -> B -> C -> D
  const linearEdges: BuildFlowEdgeModel[] = [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "D" },
  ];

  it("traverses the full chain from a middle node", () => {
    const result = computeFullPath("B", linearEdges);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(true);
    expect(result.has("D")).toBe(true);
    expect(result.size).toBe(4);
  });

  it("traverses upstream from a leaf node", () => {
    const result = computeFullPath("D", linearEdges);
    expect(result.size).toBe(4);
    expect(result.has("A")).toBe(true);
  });

  it("traverses downstream from a root node", () => {
    const result = computeFullPath("A", linearEdges);
    expect(result.size).toBe(4);
    expect(result.has("D")).toBe(true);
  });

  // Diamond: A -> B, A -> C, B -> D, C -> D
  const diamondEdges: BuildFlowEdgeModel[] = [
    { from: "A", to: "B" },
    { from: "A", to: "C" },
    { from: "B", to: "D" },
    { from: "C", to: "D" },
  ];

  it("includes all paths through a diamond from the root", () => {
    const result = computeFullPath("A", diamondEdges);
    expect(result.size).toBe(4);
  });

  it("includes only the flow through a branch node, not parallel branches", () => {
    const result = computeFullPath("B", diamondEdges);
    // B's flow: A -> B -> D (C is a parallel branch not through B)
    expect(result.size).toBe(3);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("D")).toBe(true);
    expect(result.has("C")).toBe(false);
  });

  // Disconnected: A -> B, C -> D (two separate chains)
  const disconnectedEdges: BuildFlowEdgeModel[] = [
    { from: "A", to: "B" },
    { from: "C", to: "D" },
  ];

  it("only includes the connected component", () => {
    const result = computeFullPath("A", disconnectedEdges);
    expect(result.size).toBe(2);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(false);
    expect(result.has("D")).toBe(false);
  });

  it("handles an isolated node with no edges", () => {
    const result = computeFullPath("Z", disconnectedEdges);
    expect(result.size).toBe(1);
    expect(result.has("Z")).toBe(true);
  });
});
