/**
 * Shared utility functions for the Build Flow view.
 * Extracted from BuildFlow.tsx for testability and DRY.
 */

import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

// --- DOM context ---

const ELEMENT_IDS = [
  "pgv-build-flow-root",
  "pgv-build-flow-summary",
  "pgv-build-flow-job",
] as const;

function getElement(): HTMLElement | null {
  for (const id of ELEMENT_IDS) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

/** Returns the first matching mount-point element for the Build Flow view. */
export function getRootElement(): HTMLElement | null {
  return getElement();
}

export function getBaseUrl(): string {
  return getElement()?.dataset.buildUrl || "";
}

export function getRootUrl(): string {
  return getElement()?.dataset.rootUrl || "";
}

export function shouldShowHeading(): boolean {
  return getElement()?.dataset.showHeading === "true";
}

export function isFullPageContext(): boolean {
  return getElement()?.dataset.fullPage === "true";
}

// --- Status mapping ---

const STATUS_CLASSES: Record<string, string> = {
  SUCCESS: "pgv-build-flow__node--success",
  FAILURE: "pgv-build-flow__node--failure",
  UNSTABLE: "pgv-build-flow__node--unstable",
  ABORTED: "pgv-build-flow__node--aborted",
  IN_PROGRESS: "pgv-build-flow__node--in-progress",
  QUEUED: "pgv-build-flow__node--queued",
};

export function statusClass(status: string): string {
  return STATUS_CLASSES[status] || "pgv-build-flow__node--not-built";
}

const STATUS_TO_RESULT: Record<string, Result> = {
  SUCCESS: Result.success,
  FAILURE: Result.failure,
  UNSTABLE: Result.unstable,
  ABORTED: Result.aborted,
  IN_PROGRESS: Result.running,
  QUEUED: Result.queued,
  NOT_BUILT: Result.not_built,
};

export function toResult(status: string): Result {
  return STATUS_TO_RESULT[status] || Result.unknown;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "var(--success-color)",
  FAILURE: "var(--error-color)",
  UNSTABLE: "var(--warning-color)",
  IN_PROGRESS: "var(--build-color)",
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] || "var(--text-color-secondary)";
}

export function resultDotColor(result: string): string {
  // Same palette as statusColor, but IN_PROGRESS gets the default (secondary)
  return STATUS_COLORS[result] || "var(--text-color-secondary)";
}

// --- Focus path (transitive closure) ---

interface Edge {
  from: string;
  to: string;
}

/**
 * Computes the full upstream + downstream path through a given node.
 * Returns a Set of all node IDs reachable from `nodeId` by traversing
 * edges in both directions (BFS).
 */
export function computeFullPath(nodeId: string, edges: Edge[]): Set<string> {
  // Build adjacency lists for both directions
  const downstream = new Map<string, string[]>();
  const upstream = new Map<string, string[]>();
  for (const e of edges) {
    if (!downstream.has(e.from)) downstream.set(e.from, []);
    downstream.get(e.from)!.push(e.to);
    if (!upstream.has(e.to)) upstream.set(e.to, []);
    upstream.get(e.to)!.push(e.from);
  }

  const result = new Set<string>([nodeId]);

  function bfs(adjacencyMap: Map<string, string[]>) {
    const queue: string[] = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of adjacencyMap.get(current) ?? []) {
        if (!result.has(next)) {
          result.add(next);
          queue.push(next);
        }
      }
    }
  }

  bfs(downstream);
  bfs(upstream);

  return result;
}

/**
 * Computes the set of node IDs that should be highlighted when hovering a node.
 * Returns null if no node is hovered or the graph is flattened (no edges shown).
 */
export function computeHighlightedIds(
  hoveredNodeId: string | null,
  edges: Edge[],
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
