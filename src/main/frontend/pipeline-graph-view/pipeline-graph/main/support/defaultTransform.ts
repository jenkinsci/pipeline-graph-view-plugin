import { NodeInfo, Result } from "../PipelineGraphModel.tsx";

/**
 * Smallest scale the graph is automatically zoomed out to. Below this, labels
 * become hard to read, so wider graphs are panned instead of shrunk further.
 * Users can still zoom out manually.
 */
export const MIN_READABLE_SCALE = 0.8;

export interface DefaultTransform {
  initialScale: number;
  minScale: number;
  scale: number;
  positionX: number;
  positionY: number;
}

/**
 * The x position of the stage that should be in view by default: the left-most
 * running (or paused) stage, otherwise the left-most failed stage.
 */
export function findFocusX(nodes: NodeInfo[]): number | undefined {
  let active: number | undefined;
  let failed: number | undefined;
  for (const node of nodes) {
    if (node.isPlaceholder) continue;
    const state = node.stage.state;
    if (state === Result.running || state === Result.paused) {
      active = active === undefined ? node.x : Math.min(active, node.x);
    } else if (state === Result.failure) {
      failed = failed === undefined ? node.x : Math.min(failed, node.x);
    }
  }
  return active ?? failed;
}

/**
 * Scale the graph to fit the viewport, but not below MIN_READABLE_SCALE. If the
 * graph is still wider than the viewport, pan so that the focus x position is
 * centered, without panning past either end of the graph.
 */
export function computeDefaultTransform(
  viewportWidth: number,
  viewportHeight: number,
  graphWidth: number,
  graphHeight: number,
  focusX?: number,
): DefaultTransform {
  const initialScale = Math.min(1, viewportWidth / graphWidth);
  const minScale = initialScale * 0.75;
  const scale = Math.max(initialScale, MIN_READABLE_SCALE);
  const scaledWidth = graphWidth * scale;
  let positionX = Math.max(0, (viewportWidth - scaledWidth) / 2);
  if (scaledWidth > viewportWidth && focusX !== undefined) {
    positionX = Math.min(
      0,
      Math.max(viewportWidth - scaledWidth, viewportWidth / 2 - focusX * scale),
    );
  }
  const positionY = Math.max(0, (viewportHeight - graphHeight * scale) / 2);
  return { initialScale, minScale, scale, positionX, positionY };
}
