import { FunctionComponent } from "react";

import {
  type LayoutDirection,
  type LayoutNode,
  NODE_HEIGHT,
} from "./BuildFlowLayout.ts";
import { statusColor } from "./BuildFlowUtils.ts";

export const BuildFlowEdge: FunctionComponent<{
  from: LayoutNode;
  to: LayoutNode;
  sourceStatus: string;
  direction: LayoutDirection;
  nodeWidth: number;
  isDimmed: boolean;
  isFirstMount: boolean;
  index: number;
}> = ({
  from,
  to,
  sourceStatus,
  direction,
  nodeWidth,
  isDimmed,
  isFirstMount,
  index,
}) => {
  let x1: number, y1: number, x2: number, y2: number;

  if (direction === "LTR") {
    x1 = from.x + nodeWidth;
    y1 = from.y + NODE_HEIGHT / 2;
    x2 = to.x;
    y2 = to.y + NODE_HEIGHT / 2;
  } else {
    x1 = from.x + nodeWidth / 2;
    y1 = from.y + NODE_HEIGHT;
    x2 = to.x + nodeWidth / 2;
    y2 = to.y;
  }

  let path: string;
  if (direction === "LTR") {
    const offset = Math.max(30, Math.abs(x2 - x1) * 0.4);
    path = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
  } else {
    const offset = Math.max(30, Math.abs(y2 - y1) * 0.4);
    path = `M ${x1} ${y1} C ${x1} ${y1 + offset}, ${x2} ${y2 - offset}, ${x2} ${y2}`;
  }

  const edgeClass =
    sourceStatus === "IN_PROGRESS"
      ? "pgv-build-flow__edge pgv-build-flow__edge--in-progress"
      : "pgv-build-flow__edge";

  return (
    <g
      className={edgeClass}
      aria-hidden="true"
      style={{
        opacity: isDimmed ? 0.15 : undefined,
        transition: "opacity var(--standard-transition, 0.2s)",
        ...(isFirstMount
          ? { animationDelay: `${Math.min(index * 30 + 150, 600)}ms` }
          : {}),
      }}
    >
      <path
        d={path}
        fill="none"
        stroke={statusColor(sourceStatus)}
        strokeWidth={2}
      />
    </g>
  );
};
