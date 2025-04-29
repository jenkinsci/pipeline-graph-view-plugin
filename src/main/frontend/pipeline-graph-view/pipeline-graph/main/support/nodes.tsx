import "./nodes.scss";

import { CSSProperties, ReactElement } from "react";

import StatusIcon, {
  resultToColor,
} from "../../../../common/components/status-icon.tsx";
import Tooltip from "../../../../common/components/tooltip.tsx";
import { classNames } from "../../../../common/utils/classnames.ts";
import { Total } from "../../../../common/utils/timings.tsx";
import { CounterNodeInfo } from "../PipelineGraphLayout.ts";
import {
  LayoutInfo,
  NodeColumn,
  NodeInfo,
  StageInfo,
} from "../PipelineGraphModel.tsx";

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

interface NodeProps {
  node: NodeInfo;
  collapsed?: boolean;
  /**
   * If provided stages won't navigate on click, instead calling onStageSelect with the selected stage
   */
  onStageSelect?: (nodeId: string) => void;
  isSelected: boolean;
}

/**
 * Generate the SVG elements to represent a node.
 */
export function Node({
  node,
  collapsed,
  onStageSelect,
  isSelected,
}: NodeProps) {
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
        <span className={"PWGx-pipeline-node-terminal"} />
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
    className: classNames(
      "PWGx-pipeline-node",
      "PWGx-pipeline-node--" + state,
      resultToColor(node.stage.state, node.stage.skeleton),
      {
        "PWGx-pipeline-node--selected": isSelected,
      },
    ),
  };

  let tooltip: ReactElement | undefined;
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
          <a
            href={document.head.dataset.rooturl + url}
            onClick={(e) => {
              if (onStageSelect) {
                e.preventDefault();
                onStageSelect(String(node.stage.id));
              }
            }}
          >
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

  const selectedNode: NodeInfo | undefined = (() => {
    for (const column of nodeColumns) {
      for (const row of column.rows) {
        for (const node of row) {
          if (!node.isPlaceholder && isStageSelected(node.stage)) {
            return node;
          }
        }
      }
    }
    return undefined;
  })();

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
