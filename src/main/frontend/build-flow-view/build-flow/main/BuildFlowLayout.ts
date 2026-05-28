/**
 * Pure layout computation and formatting utilities for the Build Flow view.
 * Extracted for unit testing.
 */

import {
  BuildFlowEdgeModel,
  BuildFlowNodeModel,
} from "../model/BuildFlowModel.ts";

// --- Layout constants ---
export const NODE_WIDTH_MIN = 140;
export const NODE_WIDTH_MAX = 320;
export const NODE_HEIGHT = 72;
export const COLUMN_GAP = 60;
export const ROW_GAP = 24;
export const PADDING = 12;
export const CHAR_WIDTH_APPROX = 7;
export const FLAT_CONTAINER_WIDTH = 800;
export const FLAT_COL_GAP = 16;
export const FLAT_ROW_GAP = 12;

export type LayoutDirection = "LTR" | "TTB";

export interface LayoutNode {
  node: BuildFlowNodeModel;
  col: number;
  row: number;
  x: number;
  y: number;
}

export interface LayoutResult {
  layoutNodes: LayoutNode[];
  width: number;
  height: number;
}

/** Compute node width from the longest displayed name */
export function computeNodeWidth(
  nodes: BuildFlowNodeModel[],
  showFullNames: boolean,
): number {
  let maxLen = 0;
  for (const n of nodes) {
    const name = showFullNames ? n.jobFullName : n.jobName;
    if (name.length > maxLen) maxLen = name.length;
  }
  const computed = maxLen * CHAR_WIDTH_APPROX + 32;
  return Math.min(NODE_WIDTH_MAX, Math.max(NODE_WIDTH_MIN, computed));
}

/** Flat grid layout - no edges, just cards in rows */
export function computeFlatLayout(
  nodes: BuildFlowNodeModel[],
  nodeWidth: number,
): LayoutResult {
  if (nodes.length === 0) return { layoutNodes: [], width: 0, height: 0 };
  const cols = Math.max(
    1,
    Math.floor(FLAT_CONTAINER_WIDTH / (nodeWidth + FLAT_COL_GAP)),
  );
  const layoutNodes: LayoutNode[] = nodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      node,
      col,
      row,
      x: PADDING + col * (nodeWidth + FLAT_COL_GAP),
      y: PADDING + row * (NODE_HEIGHT + FLAT_ROW_GAP),
    };
  });
  const totalRows = Math.ceil(nodes.length / cols);
  return {
    layoutNodes,
    width: PADDING * 2 + cols * nodeWidth + (cols - 1) * FLAT_COL_GAP,
    height:
      PADDING * 2 + totalRows * NODE_HEIGHT + (totalRows - 1) * FLAT_ROW_GAP,
  };
}

/** DAG layout using longest-path column assignment */
export function computeLayout(
  nodes: BuildFlowNodeModel[],
  edges: BuildFlowEdgeModel[],
  direction: LayoutDirection,
  nodeWidth: number,
): LayoutResult {
  if (nodes.length === 0) return { layoutNodes: [], width: 0, height: 0 };

  const nodeMap = new Map<string, BuildFlowNodeModel>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const n of nodes) {
    children.set(n.id, []);
    parents.set(n.id, []);
  }
  for (const e of edges) {
    children.get(e.from)?.push(e.to);
    parents.get(e.to)?.push(e.from);
  }

  const col = new Map<string, number>();
  const visited = new Set<string>();

  function assignCol(id: string): number {
    if (col.has(id)) return col.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const parentIds = parents.get(id) || [];
    const maxParentCol =
      parentIds.length === 0
        ? -1
        : Math.max(...parentIds.map((p) => assignCol(p)));
    const c = maxParentCol + 1;
    col.set(id, c);
    return c;
  }

  for (const n of nodes) assignCol(n.id);

  const columns = new Map<number, string[]>();
  for (const n of nodes) {
    const c = col.get(n.id)!;
    if (!columns.has(c)) columns.set(c, []);
    columns.get(c)!.push(n.id);
  }

  const maxCol = Math.max(...columns.keys());
  const maxRows = Math.max(...[...columns.values()].map((ids) => ids.length));

  const layoutNodes: LayoutNode[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const ids = columns.get(c) || [];
    const count = ids.length;
    ids.forEach((id, row) => {
      let x: number, y: number;
      if (direction === "LTR") {
        const levelHeight = count * NODE_HEIGHT + (count - 1) * ROW_GAP;
        const totalHeight = maxRows * NODE_HEIGHT + (maxRows - 1) * ROW_GAP;
        const yOffset = (totalHeight - levelHeight) / 2;
        x = PADDING + c * (nodeWidth + COLUMN_GAP);
        y = PADDING + yOffset + row * (NODE_HEIGHT + ROW_GAP);
      } else {
        const levelWidth = count * nodeWidth + (count - 1) * COLUMN_GAP;
        const totalWidth = maxRows * nodeWidth + (maxRows - 1) * COLUMN_GAP;
        const xOffset = (totalWidth - levelWidth) / 2;
        x = PADDING + xOffset + row * (nodeWidth + COLUMN_GAP);
        y = PADDING + c * (NODE_HEIGHT + COLUMN_GAP);
      }
      layoutNodes.push({ node: nodeMap.get(id)!, col: c, row, x, y });
    });
  }

  let width: number, height: number;
  if (direction === "LTR") {
    width = PADDING * 2 + (maxCol + 1) * nodeWidth + maxCol * COLUMN_GAP;
    height = PADDING * 2 + maxRows * NODE_HEIGHT + (maxRows - 1) * ROW_GAP;
  } else {
    width = PADDING * 2 + maxRows * nodeWidth + (maxRows - 1) * COLUMN_GAP;
    height = PADDING * 2 + (maxCol + 1) * NODE_HEIGHT + maxCol * COLUMN_GAP;
  }

  return { layoutNodes, width, height };
}

// --- Formatting ---

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  return remainSec > 0 ? `${minutes}m ${remainSec}s` : `${minutes}m`;
}

export function formatStatus(status: string): string {
  switch (status) {
    case "IN_PROGRESS":
      return "In Progress";
    case "NOT_BUILT":
      return "Not Built";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
