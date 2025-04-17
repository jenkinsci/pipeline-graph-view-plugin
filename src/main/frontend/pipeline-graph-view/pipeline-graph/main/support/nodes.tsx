import * as React from "react";

import {
  decodeResultValue,
  LayoutInfo,
  NodeColumn,
  NodeInfo,
  StageInfo,
} from "../PipelineGraphModel";
import StatusIcon from "../../../../common/components/status-icon";

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

interface NodeProps {
  node: NodeInfo;
}
/**
 * Generate the SVG elements to represent a node.
 */
export function Node({ node }: NodeProps) {
  const key = node.key;
  const groupChildren: SVGChildren = [];

  if (node.isPlaceholder) {
    groupChildren.push(<span className={"PWGx-pipeline-node-terminal"}></span>);
    const groupProps = {
      key,
      style: {
        position: "absolute",
        top: node.y,
        left: node.x,
        translate: "-50% -50%",
      },
      className: "PWGx-pipeline-node",
    };
    return React.createElement("div", groupProps, ...groupChildren);
  }

  const { title, state, url } = node.stage ?? {};
  const resultClean = decodeResultValue(state);

  groupChildren.push(
    <StatusIcon
      status={node.stage.state}
      percentage={node.stage.completePercent}
      skeleton={node.stage.skeleton}
    />,
  );

  if (title) {
    groupChildren.push(<title>{title}</title>);
  }

  const clickable =
    !node.isPlaceholder &&
    node.stage?.state !== "skipped" &&
    !node.stage.skeleton;

  // Most of the nodes are in shared code, so they're rendered at 0,0. We transform with a <g> to position them
  const groupProps = {
    key,
    href: clickable ? document.head.dataset.rooturl + url : null,
    style: {
      position: "absolute",
      top: node.y,
      left: node.x,
      translate: "-50% -50%",
    },
    className: "PWGx-pipeline-node PWGx-pipeline-node--" + resultClean,
  };

  return React.createElement(
    clickable ? "a" : "div",
    groupProps,
    ...groupChildren,
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
        if (node.isPlaceholder === false && isStageSelected(node.stage)) {
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
