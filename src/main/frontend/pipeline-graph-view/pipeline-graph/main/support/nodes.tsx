import React from "react";
import { CSSProperties } from "react";

import {
  LayoutInfo,
  NodeColumn,
  NodeInfo,
  StageInfo,
} from "../PipelineGraphModel.tsx";
import StatusIcon, {
  resultToColor,
} from "../../../../common/components/status-icon.tsx";
import Tooltip from "../../../../common/components/tooltip.tsx";
import { Total } from "../../../../common/utils/timings.tsx";
import "./nodes.scss";
import { CounterNodeInfo } from "../PipelineGraphLayout.ts";

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

interface NodeProps {
  node: NodeInfo;
  collapsed?: boolean;
}

/**
 * Generate the SVG elements to represent a node.
 */
export function Node({ node, collapsed }: NodeProps) {
  const key = node.key;

  if (node.isPlaceholder) {
    if (node.type === "counter") {
      const mappedNode = node as CounterNodeInfo;

      const tooltip = (
        <ol className="pgv-node__counter-tooltip">
          {mappedNode.stages.map((stage) => (
            <li key={stage.id}>
              <a
                className={"jenkins-button jenkins-button--tertiary"}
                href={document.head.dataset.rooturl + stage.url}
              >
                <StatusIcon
                  status={stage.state}
                  percentage={stage.completePercent}
                  skeleton={stage.skeleton}
                />
                {stage.name}
                <span style={{ color: "var(--text-color-secondary)" }}>
                  <Total ms={stage.totalDurationMillis} />
                </span>
              </a>
            </li>
          ))}
        </ol>
      );

      return (
        <Tooltip content={tooltip} interactive appendTo={document.body}>
          <div
            key={key}
            style={{
              position: "absolute",
              top: node.y,
              left: node.x,
              translate: "-50% -50%",
            }}
            className={"PWGx-pipeline-node"}
          >
            <span className={"PWGx-pipeline-node-counter"}>
              {mappedNode.stages.length}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <div
        key={key}
        style={{
          position: "absolute",
          top: node.y,
          left: node.x,
          translate: "-50% -50%",
        }}
        className="PWGx-pipeline-node"
      >
        <span className={"PWGx-pipeline-node-terminal"}></span>
      </div>
    );
  }

  const groupChildren: SVGChildren = [];
  const { title, state, url } = node.stage ?? {};
  groupChildren.push(
    <StatusIcon
      key={`icon-${node.id}`}
      status={node.stage.state}
      percentage={node.stage.completePercent}
      skeleton={node.stage.skeleton}
    />,
  );

  const clickable =
    !node.isPlaceholder &&
    node.stage?.state !== "skipped" &&
    !node.stage.skeleton;

  // Most of the nodes are in shared code, so they're rendered at 0,0. We transform with a <g> to position them
  const groupProps = {
    key,
    style: {
      position: "absolute",
      top: node.y,
      left: node.x,
      translate: "-50% -50%",
    } as CSSProperties,
    className:
      "PWGx-pipeline-node PWGx-pipeline-node--" +
      state +
      " " +
      resultToColor(node.stage.state, node.stage.skeleton),
  };

  let tooltip: React.ReactElement | undefined;
  if (collapsed) {
    tooltip = (
      <div className="pgv-node-tooltip">
        <div>{title}</div>
        <div>
          <Total ms={node.stage.totalDurationMillis} />
        </div>
      </div>
    );
  }

  return (
    <Tooltip content={tooltip}>
      <div {...groupProps}>
        {groupChildren}
        {clickable && (
          <a href={document.head.dataset.rooturl + url}>
            <span className="jenkins-visually-hidden">{title}</span>
          </a>
        )}
      </div>
    </Tooltip>
  );
}

interface SelectionHighlightProps {
  layout: LayoutInfo;
  nodeColumns: Array<NodeColumn>;
  isStageSelected: (stage: StageInfo) => boolean;
}

/**
 * Generates SVG for visual highlight to show which node is selected.
 */
export function SelectionHighlight({
  layout,
  nodeColumns,
  isStageSelected,
}: SelectionHighlightProps) {
  const { nodeRadius, connectorStrokeWidth } = layout;
  const highlightRadius = Math.ceil(
    nodeRadius + 0.5 * connectorStrokeWidth + 1,
  );
  let selectedNode: NodeInfo | undefined;

  columnLoop: for (const column of nodeColumns) {
    for (const row of column.rows) {
      for (const node of row) {
        if (!node.isPlaceholder && isStageSelected(node.stage)) {
          selectedNode = node;
          break columnLoop;
        }
      }
    }
  }

  if (!selectedNode) return null;

  const transform = `translate(${selectedNode.x} ${selectedNode.y})`;

  return (
    <g
      className="PWGx-pipeline-selection-highlight"
      transform={transform}
      key="selection-highlight"
    >
      <circle r={highlightRadius} strokeWidth={connectorStrokeWidth} />
    </g>
  );
}
