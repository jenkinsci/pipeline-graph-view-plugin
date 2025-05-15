import { LocalizedMessageKey, Messages } from "../../../common/i18n/index.ts";
import {
  CompositeConnection,
  LayoutInfo,
  NodeColumn,
  NodeInfo,
  NodeLabelInfo,
  PlaceholderNodeInfo,
  PositionedGraph,
  StageInfo,
  StageNodeInfo,
} from "./PipelineGraphModel.tsx";

export const sequentialStagesLabelOffset = 80;

const maxColumnsWhenCollapsed = 13;

/**
 * Main process for laying out the graph. Creates and positions markers for each component, but creates no components.
 *
 *  1. Creates nodes for each stage in the pipeline
 *  2. Position the nodes in columns for each top stage, and in rows within each column based on execution order
 *  3. Create all the connections between nodes that need to be rendered
 *  4. Create a bigLabel per column, and a smallLabel for any child nodes
 *  5. Measure the extents of the graph
 */
export function layoutGraph(
  newStages: Array<StageInfo>,
  layout: LayoutInfo,
  collapsed: boolean,
  messages: Messages,
): PositionedGraph {
  const stageNodeColumns = createNodeColumns(newStages, collapsed);
  const { nodeSpacingH, ypStart } = layout;

  const startNode: NodeInfo = {
    x: 0,
    y: 0,
    name: messages.format(LocalizedMessageKey.start),
    id: -1,
    isPlaceholder: true,
    key: "start-node",
    type: "start",
  };

  const endNode: NodeInfo = {
    x: 0,
    y: 0,
    name: messages.format(LocalizedMessageKey.end),
    id: -3,
    isPlaceholder: true,
    key: "end-node",
    type: "end",
  };

  const counterNode: CounterNodeInfo = {
    x: 0,
    y: 0,
    name: "Counter",
    id: -2,
    isPlaceholder: true,
    key: "counter-node",
    type: "counter",
    stages: [],
  };

  function filterWhenCollapsed(nodes: NodeColumn[]) {
    if (!collapsed) {
      return nodes;
    }

    const start = nodes[0];
    const end = nodes[nodes.length - 1];
    const counter = {
      rows: [[counterNode]],
      centerX: 0,
      hasBranchLabels: false,
      startX: 0,
    };

    const middleNodes = nodes.filter((node) => node !== start && node !== end);

    const middleStages = middleNodes.flatMap((node) =>
      node.rows.flatMap((row) =>
        row.flatMap((e) => (e as StageNodeInfo).stage),
      ),
    );

    const newMiddleNodes = createNodeColumns(middleStages, collapsed);

    const visibleNodes = newMiddleNodes.slice(0, maxColumnsWhenCollapsed);
    const hiddenNodes = newMiddleNodes.slice(maxColumnsWhenCollapsed);

    const result = [start, ...visibleNodes];

    if (hiddenNodes.length > 0) {
      (counter.rows[0][0] as CounterNodeInfo).stages = hiddenNodes.flatMap(
        (node) =>
          node.rows.flatMap((row) =>
            row.flatMap((e) => (e as StageNodeInfo).stage),
          ),
      );
      result.push(counter);
    }

    result.push(end);
    return result;
  }

  const allNodeColumns: Array<NodeColumn> = filterWhenCollapsed([
    { rows: [[startNode]], centerX: 0, hasBranchLabels: false, startX: 0 }, // Column X positions calculated later
    ...stageNodeColumns,
    { rows: [[endNode]], centerX: 0, hasBranchLabels: false, startX: 0 },
  ]);

  positionNodes(allNodeColumns, layout);

  const bigLabels = createBigLabels(allNodeColumns, collapsed);
  const smallLabels = createSmallLabels(allNodeColumns, collapsed);
  const branchLabels = createBranchLabels(allNodeColumns, collapsed);
  const connections = createConnections(allNodeColumns);

  // Calculate the size of the graph
  let measuredWidth = 0;
  let measuredHeight = 60;

  for (const column of allNodeColumns) {
    for (const row of column.rows) {
      for (const node of row) {
        measuredWidth = Math.max(measuredWidth, node.x + nodeSpacingH / 2);
        measuredHeight = collapsed
          ? 60
          : Math.max(measuredHeight, node.y + ypStart);
      }
    }
  }

  return {
    nodeColumns: allNodeColumns,
    connections,
    bigLabels,
    smallLabels,
    branchLabels,
    measuredWidth,
    measuredHeight,
  };
}

export interface CounterNodeInfo extends PlaceholderNodeInfo {
  stages: StageInfo[];
}

/**
 * Generate an array of columns, based on the top-level stages
 */
export function createNodeColumns(
  topLevelStages: Array<StageInfo> = [],
  collapsed: boolean,
): Array<NodeColumn> {
  const nodeColumns: Array<NodeColumn> = [];

  const makeNodeForStage = (
    stage: StageInfo,
    seqContainerName: string | undefined = undefined,
  ): NodeInfo => {
    return {
      x: 0, // Layout is done later
      y: 0,
      name: stage.name,
      id: stage.id,
      stage,
      seqContainerName,
      isPlaceholder: false,
      key: "n_" + stage.id,
    };
  };

  const processTopStage = (topStage: StageInfo, willRecurse: boolean) => {
    // If stage has children, we don't draw a node for it, just its children
    const stagesForColumn =
      !willRecurse && stageHasChildren(topStage)
        ? topStage.children
        : [topStage];

    const column: NodeColumn = {
      topStage,
      rows: [],
      centerX: 0, // Layout is done later
      startX: 0,
      hasBranchLabels: false, // set below
    };

    for (const nodeStage of stagesForColumn) {
      const rowNodes: Array<NodeInfo> = [];
      if (!willRecurse && stageHasChildren(nodeStage)) {
        column.hasBranchLabels = true;
        forEachChildStage(nodeStage, (parentStage, childStage, _) =>
          rowNodes.push(makeNodeForStage(childStage, parentStage.name)),
        );
      } else {
        rowNodes.push(makeNodeForStage(nodeStage));
      }
      column.rows.push(rowNodes);
    }

    nodeColumns.push(column);
  };

  for (const protoTopStage of topLevelStages) {
    const selfParentTopStage = { ...protoTopStage, children: [protoTopStage] };

    forEachChildStage(selfParentTopStage, (_, topStage, willRecurse) =>
      processTopStage(topStage, willRecurse),
    );
  }

  return nodeColumns;
}

/**
 * Check if stage has children.
 */
function stageHasChildren(stage: StageInfo): boolean {
  return !!(stage.children && stage.children.length);
}

/**
 * Walk the children of the stage recursively (depth first), invoking callback for each child.
 *
 * Don't recurse into parallel children as those are processed separately.
 * If one child of the stage is parallel, we assume all of its children are.
 */
function forEachChildStage(
  topStage: StageInfo,
  callback: (parent: StageInfo, child: StageInfo, willRecurse: boolean) => void,
) {
  if (!stageHasChildren(topStage)) {
    return;
  }
  for (const stage of topStage.children) {
    const needToRecurse =
      stageHasChildren(stage) && stage.children[0].type !== "PARALLEL";
    callback(topStage, stage, needToRecurse);
    if (needToRecurse) {
      forEachChildStage(stage, callback);
    }
  }
}

/**
 * Walks the columns of nodes giving them x and y positions. Mutates the node objects in place for now.
 */
function positionNodes(
  nodeColumns: Array<NodeColumn>,
  { nodeSpacingH, parallelSpacingH, nodeSpacingV, ypStart }: LayoutInfo,
) {
  let xp = nodeSpacingH / 2;
  let previousTopNode: NodeInfo | undefined;

  for (const column of nodeColumns) {
    const topNode = column.rows[0][0];

    let yp = ypStart; // Reset Y to top for each column

    if (previousTopNode) {
      // Advance X position
      if (previousTopNode.isPlaceholder || topNode.isPlaceholder) {
        // Don't space placeholder nodes (start/end) as wide as normal.
        if (topNode.key === "counter-node") {
          xp += nodeSpacingH;
        } else {
          xp += Math.floor(nodeSpacingH * 0.7);
        }
      } else {
        xp += nodeSpacingH;
      }
    }

    let widestRow = 0;
    for (const row of column.rows) {
      widestRow = Math.max(widestRow, row.length);
    }

    const xpStart = xp; // Remember the left-most position in this column

    // Make room for row labels
    if (column.hasBranchLabels) {
      xp += sequentialStagesLabelOffset;
    }

    let maxX = xp;

    for (const row of column.rows) {
      let nodeX = xp; // Start nodes at current column xp (not xpstart as that includes branch label)

      // Offset the beginning of narrower rows towards column center
      nodeX += Math.round((widestRow - row.length) * parallelSpacingH * 0.5);

      for (const node of row) {
        maxX = Math.max(maxX, nodeX);
        node.x = nodeX;
        node.y = yp;
        nodeX += parallelSpacingH; // Space out nodes in each row
      }

      yp += nodeSpacingV; // LF
    }

    column.centerX = Math.round((xpStart + maxX) / 2);
    column.startX = xpStart; // Record on column for use later to position branch labels
    xp = maxX; // Make sure we're at the end of the widest row for this column before next loop

    previousTopNode = topNode;
  }
}

/**
 * Generate label descriptions for big labels at the top of each column
 */
function createBigLabels(
  columns: Array<NodeColumn>,
  collapsed: boolean,
): Array<NodeLabelInfo> {
  const labels: Array<NodeLabelInfo> = [];

  if (collapsed) {
    return [];
  }

  for (const column of columns) {
    const node = column.rows[0][0];
    const stage = column.topStage;
    const text = stage ? stage.name : node.name;
    const key = "l_b_" + node.key;

    // bigLabel is located above center of column, but offset if there's branch labels
    let x = column.centerX;
    if (column.hasBranchLabels) {
      x += Math.floor(sequentialStagesLabelOffset / 2);
    }

    labels.push({
      x,
      y: node.y,
      node,
      stage,
      text,
      key,
    });
  }

  return labels;
}

/**
 * Generate label descriptions for small labels under the nodes
 */
function createSmallLabels(
  columns: Array<NodeColumn>,
  collapsed: boolean,
): Array<NodeLabelInfo> {
  const labels: Array<NodeLabelInfo> = [];
  if (collapsed) {
    return labels;
  }
  for (const column of columns) {
    for (const row of column.rows) {
      for (const node of row) {
        // We add small labels to parallel nodes only so skip others
        if (node.isPlaceholder || node.stage === column.topStage) {
          continue;
        }
        const label: NodeLabelInfo = {
          x: node.x,
          y: node.y,
          text: node.name,
          key: "l_s_" + node.key,
          node,
        };

        if (!node.isPlaceholder) {
          label.stage = node.stage;
        }

        labels.push(label);
      }
    }
  }

  return labels;
}

/**
 * Generate label descriptions for named sequential parallels
 */
function createBranchLabels(
  columns: Array<NodeColumn>,
  collapsed: boolean,
): Array<NodeLabelInfo> {
  const labels: Array<NodeLabelInfo> = [];
  if (collapsed) {
    return labels;
  }
  let count = 0;

  for (const column of columns) {
    if (column.hasBranchLabels) {
      for (const row of column.rows) {
        const firstNode = row[0];
        if (!firstNode.isPlaceholder && firstNode.seqContainerName) {
          labels.push({
            x: column.startX,
            y: firstNode.y,
            key: `branchLabel-${++count}`,
            node: firstNode,
            text: firstNode.seqContainerName,
          });
        }
      }
    }
  }

  return labels;
}

/**
 * Generate connection information from column to column
 */
function createConnections(
  columns: Array<NodeColumn>,
): Array<CompositeConnection> {
  const connections: Array<CompositeConnection> = [];

  let sourceNodes: Array<NodeInfo> = [];
  let skippedNodes: Array<NodeInfo> = [];

  for (const column of columns) {
    if (column.topStage && column.topStage.state === "skipped") {
      skippedNodes.push(column.rows[0][0]);
      continue;
    }

    // Connections to each row in this column
    if (sourceNodes.length) {
      connections.push({
        sourceNodes,
        destinationNodes: column.rows.map((row) => row[0]), // First node of each row
        skippedNodes,
        hasBranchLabels: column.hasBranchLabels,
      });
    }

    // Simple horizontal connections between nodes within each row
    for (const row of column.rows) {
      for (let i = 0; i < row.length - 1; i++) {
        connections.push({
          sourceNodes: [row[i]],
          destinationNodes: [row[i + 1]],
          skippedNodes: [],
          hasBranchLabels: false,
        });
      }
    }

    sourceNodes = column.rows.map((row) => row[row.length - 1]); // Last node of each row
    skippedNodes = [];
  }

  return connections;
}
