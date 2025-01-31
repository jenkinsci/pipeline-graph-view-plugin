import * as React from "react";

import { getGroupForResult } from "../support/StatusIcons";
import {
  decodeResultValue,
  LayoutInfo,
  NodeColumn,
  NodeInfo,
  StageInfo,
} from "../PipelineGraphModel";

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

interface NodeProps {
  node: NodeInfo;
  layout: LayoutInfo;
  isStageSelected: (stage: StageInfo) => boolean;
  onClick: (node: NodeInfo) => void;
}
/**
 * Generate the SVG elements to represent a node.
 */
export function Node({ node, layout, isStageSelected, onClick }: NodeProps) {
  let nodeIsSelected = false;
  const { nodeRadius, connectorStrokeWidth, terminalRadius } = layout;
  const key = node.key;

  const groupChildren: SVGChildren = [];

  const { completePercent = 0, title, state } = node.stage ?? {};
  const resultClean = decodeResultValue(state);
  if (node.isPlaceholder) {
    groupChildren.push(
      <div className={'PWGx-pipeline-node-terminal'}></div>
    );
  } else {

    groupChildren.push(
      getGroupForResult(resultClean, completePercent, nodeRadius)
    );

    if (title) {
      groupChildren.push(<title>{title}</title>);
    }

    nodeIsSelected = isStageSelected(node.stage);
  }

  // Set click listener and link cursor only for nodes we want to be clickable
  const clickableProps: React.SVGProps<SVGCircleElement> = {};

  const clickable = !node.isPlaceholder && node.stage.state !== "skipped";
  // if (clickable) {
  //   clickableProps.onClick = () => onClick(node);
  // }

  // console.log(node.stage)

  // pipeline-console/?selected-node=166

  // Most of the nodes are in shared code, so they're rendered at 0,0. We transform with a <g> to position them
  const groupProps = {
    key,
    // TODO - Change this to be ../ on pipeline overview page
    href: 'pipeline-console/?selected-node=' + node.id,
    style: {
      position: 'absolute',
      top: node.y,
      left: node.x,
      translate: '-50% -50%'
    },
    className: nodeIsSelected
      ? "PWGx-pipeline-node-selected"
      : "PWGx-pipeline-node PWGx-pipeline-node" + "--" + resultClean,
    ...clickableProps
  };

  return React.createElement(clickable ? "a" : "div", groupProps, ...groupChildren);
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
    nodeRadius + 0.5 * connectorStrokeWidth + 1
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
