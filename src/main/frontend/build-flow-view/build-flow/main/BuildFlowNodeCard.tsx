import { FunctionComponent, useEffect, useState } from "react";

import StatusIcon from "../../../common/components/status-icon.tsx";
import Tooltip from "../../../common/components/tooltip.tsx";
import { BuildFlowNodeModel } from "../model/BuildFlowModel.ts";
import {
  formatDuration,
  formatStatus,
  type LayoutNode,
  NODE_HEIGHT,
} from "./BuildFlowLayout.ts";
import { resultDotColor, statusClass, toResult } from "./BuildFlowUtils.ts";

// --- Live Duration ---

const LiveDuration: FunctionComponent<{ startTimeMs: number }> = ({
  startTimeMs,
}) => {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTimeMs);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTimeMs), 1000);
    return () => clearInterval(id);
  }, [startTimeMs]);
  return <span>{formatDuration(elapsed)}</span>;
};

// --- Build History Dots ---

const BuildHistoryDots: FunctionComponent<{
  node: BuildFlowNodeModel;
  rootUrl: string;
}> = ({ node, rootUrl }) => {
  const history = [...node.recentResults!].reverse();
  return (
    <span className="pgv-build-flow__node-history">
      {history.map((r, i) => {
        const buildNumber = node.buildNumber - (history.length - 1 - i);
        return (
          <Tooltip key={i} content={`#${buildNumber} - ${formatStatus(r)}`}>
            <a
              className="pgv-build-flow__history-dot"
              style={{ background: resultDotColor(r) }}
              href={
                node.url
                  ? `${rootUrl}/${node.url.replace(/\/\d+\/$/, `/${buildNumber}/`)}`
                  : undefined
              }
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        );
      })}
    </span>
  );
};

// --- Node Card ---

export const BuildFlowNodeCard: FunctionComponent<{
  layout: LayoutNode;
  rootUrl: string;
  nodeWidth: number;
  showDuration: boolean;
  showBuildNumber: boolean;
  showFullNames: boolean;
  showDescription: boolean;
  showBuildHistory: boolean;
  index: number;
  isFirstMount: boolean;
  isDimmed: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({
  layout,
  rootUrl,
  nodeWidth,
  showDuration,
  showBuildNumber,
  showFullNames,
  showDescription,
  showBuildHistory,
  index,
  isFirstMount,
  isDimmed,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { node, x, y } = layout;
  const classes = [
    "pgv-build-flow__node",
    statusClass(node.status),
    node.isCurrentBuild ? "pgv-build-flow__node--current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const href = node.url ? `${rootUrl}/${node.url}` : undefined;
  const name = showFullNames ? node.jobFullName : node.jobName;
  const ariaLabel = `${node.jobName} #${node.buildNumber} - ${formatStatus(node.status)}`;

  return (
    <foreignObject
      x={x}
      y={y}
      width={nodeWidth}
      height={NODE_HEIGHT}
      style={{
        opacity: isDimmed ? 0.25 : 1,
        transition: "opacity var(--standard-transition, 0.2s)",
        pointerEvents: isDimmed ? "none" : undefined,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <a
        className={classes}
        href={href}
        title={node.displayName}
        aria-label={ariaLabel}
        style={
          isFirstMount
            ? { animationDelay: `${Math.min(index * 30, 500)}ms` }
            : undefined
        }
      >
        <div className="pgv-build-flow__node-header">
          <StatusIcon status={toResult(node.status)} />
          <span className="pgv-build-flow__node-name">{name}</span>
          {showBuildNumber && (
            <span className="pgv-build-flow__node-build-num">
              #{node.buildNumber}
            </span>
          )}
        </div>
        <span className="pgv-build-flow__node-meta">
          {showDuration && node.durationMs != null && (
            <span>{formatDuration(node.durationMs)}</span>
          )}
          {showDuration &&
            node.status === "IN_PROGRESS" &&
            node.startTimeMs != null && (
              <LiveDuration startTimeMs={node.startTimeMs} />
            )}
        </span>
        {showDescription && node.description && (
          <span className="pgv-build-flow__node-desc">{node.description}</span>
        )}
        {showBuildHistory &&
          node.recentResults &&
          node.recentResults.length > 0 && (
            <BuildHistoryDots node={node} rootUrl={rootUrl} />
          )}
      </a>
    </foreignObject>
  );
};
