import { BeachAccess } from "@mui/icons-material";
import { CompositeConnection, PositionedGraph } from "./PipelineGraphModel";

import {
  PlaceholderNodeInfo,
  NodeColumn,
  NodeLabelInfo,
  LayoutInfo,
  StageInfo,
  NodeInfo,
  NodeRow,
} from "./PipelineGraphModel";

export const sequentialStagesLabelOffset = 70;

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
  collasped: boolean
): PositionedGraph {
  const stageNodeColumns = createNodeColumns(newStages, collasped);
  const { nodeSpacingH, ypStart } = layout;
  
  const startNode: NodeInfo = {
    x: 0,
    y: 0,
    name: "Start",
    id: -1,
    isPlaceholder: true,
    key: "start-node",
    type: "start",
  };

  const endNode: NodeInfo = {
    x: 0,
    y: 0,
    name: "End",
    id: -2,
    isPlaceholder: true,
    key: "end-node",
    type: "end",
  };

  const allNodeColumns: Array<NodeColumn> = [
    { rows: [{beforeId: undefined, stages: [startNode], nestedRows: [], after: undefined}], centerX: 0, hasBranchLabels: false, startX: 0 }, // Column X positions calculated later
    ...stageNodeColumns,
    { rows: [{beforeId: undefined, stages: [endNode], nestedRows: [], after: undefined}], centerX: 0, hasBranchLabels: false, startX: 0 },
  ];

  positionNodes(allNodeColumns, layout);

  const bigLabels = createBigLabels(allNodeColumns);
  const smallLabels = createSmallLabels(allNodeColumns, collasped);
  const branchLabels = createBranchLabels(allNodeColumns, collasped);
  const connections = createConnections(allNodeColumns, collasped);

  // Calculate the size of the graph
  let measuredWidth = 0;
  let measuredHeight = 60;

  for (const column of allNodeColumns) {
    for (const row of column.rows) {
      for (const node of row.stages) {
        measuredWidth = Math.max(measuredWidth, node.x + nodeSpacingH / 2);
        measuredHeight = Math.max(measuredHeight, node.y + ypStart);
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


/**
 * Generate an array of columns, based on the top-level stages
 */
export function createNodeColumns(
  topLevelStages: Array<StageInfo> = [],
  collasped: boolean
): Array<NodeColumn> {
  const nodeColumns: Array<NodeColumn> = [];

  const makeNodeForStage = (
    stage: StageInfo,
    seqContainerName: string | undefined = undefined
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

  const createColumn = (topStage: StageInfo, rows:Array<NodeRow>=[], childBranches:number=0): NodeColumn => {
    console.log(`Creating column for: ${topStage.name}`);
    return {
      topStage,
      rows: rows,
      centerX: 0, // Layout is done later
      startX: 0,
      childBranches: 0,
      hasBranchLabels: false, // set below
    } as NodeColumn;
  }

  const processTopStage = (topStage: StageInfo, before: number) => {
    // If stage has children, we don't draw a node for it, just its children
    const stagesForColumn =
      stageHasChildren(topStage)
        ? topStage.children
        : [topStage];

    const column = createColumn(topStage);

    nodeColumns.push(column);
    processChildStages(stagesForColumn, column, before);
  };

  const processChildStages = (stagesForColumn: StageInfo[], column: NodeColumn, beforeId?: number)=> {
    for (const nodeStage of stagesForColumn) {
      const nodeRow = {beforeId: beforeId, stages: [], nestedRows: [], after: null} as NodeRow;
      column.rows.push(nodeRow);
      if (stageHasChildren(nodeStage) && nodeStage.children[0].type != "PARALLEL") {
          console.log(`Found parallel branch: ${nodeStage.name}`);
          column.hasBranchLabels = true;
          processBranchStage(nodeStage, column, nodeRow)
      } else {
        nodeRow.stages.push(makeNodeForStage(nodeStage));
        console.log(`Found parallel stage: ${nodeStage.name}`);
      }
      if (collasped) {
        return;
      }
    }
  }

  const processBranchStage = (nodeStage: StageInfo, column: NodeColumn, nodeRow: NodeRow, before?: number): void => {
    for (const childStage of nodeStage.children) {
      console.log(`Found parallel branch -: ${nodeStage.name}`);
      nodeRow.stages.push(makeNodeForStage(childStage, `${nodeStage.name}`));
      processChildStages(childStage.children, column, before);
    }
    
  }


  for (const protoTopStage of topLevelStages) {
    const selfParentTopStage = { ...protoTopStage, children: [protoTopStage] };
    forEachChildStage(selfParentTopStage, (parent, topStage, willRecurse) =>
      processTopStage(topStage, parent.id)
    );
  }

  // TODO@: REMOVE Useful for debugging structure:
  console.log(nodeColumns);

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
  allowRecursion: boolean = false
) {
  if (!stageHasChildren(topStage)) {
    return;
  }
  for (const stage of topStage.children) {
    // This can be in the graph if there is an unhandled exception.
    if (stage.type == "PIPELINE_START") {
      continue;
    }
    const needToRecurse = allowRecursion && stageHasChildren(stage);
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
  { nodeSpacingH, parallelSpacingH, nodeSpacingV, ypStart }: LayoutInfo
) {
  let xp = nodeSpacingH / 2;
  let previousTopNode: NodeInfo | undefined;

  for (const column of nodeColumns) {
    const topNode = column.rows[0].stages[0];

    let yp = ypStart; // Reset Y to top for each column

    if (previousTopNode) {
      // Advance X position
      if (previousTopNode.isPlaceholder  && topNode && !topNode.isPlaceholder) {
        // Don't space placeholder nodes (start/end) as wide as normal.
        xp += Math.floor(nodeSpacingH * 0.7);
      } else {
        xp += nodeSpacingH;
      }
    }

    const xpStart = xp; // Remember the left-most position in this column
    // Make room for row labels
    if (column.hasBranchLabels) {
      xp += sequentialStagesLabelOffset;
    }

    let maxX = xp;
    positionChildNodes(column.rows, xp, yp, maxX, parallelSpacingH, nodeSpacingV)

    column.centerX = Math.round((xpStart + maxX) / 2);
    column.startX = xpStart; // Record on column for use later to position branch labels
    xp = maxX; // Make sure we're at the end of the widest row for this column before next loop

    previousTopNode = topNode;
  }
}

const getWidestRow = (rows: NodeRow[], offset:number=0): number => {
  let widestRow = 0;
  for (const row of rows) {
    widestRow = Math.max(widestRow, row.stages.length);
    for (const nestedRow of row.nestedRows) {
      widestRow = Math.max(widestRow, getWidestRow(row.nestedRows, row.stages.length));
    }
  }
  return widestRow
}

const positionChildNodes = (rows: NodeRow[], xOffset: number, yOffset: number, maxX: number, parallelSpacingH: number, nodeSpacingV: number ) => {
  let widestRow = getWidestRow(rows, 0);
  
  for (const row of rows) {
      let nodeX = xOffset; // Start nodes at current column xp (not xpstart as that includes branch label)

      // Offset the beginning of narrower rows towards column center
      nodeX += Math.round((widestRow - row.stages.length) * parallelSpacingH * 0.5);

      for (const node of row.stages) {
        maxX = Math.max(maxX, nodeX);
        node.x = nodeX;
        node.y = yOffset;
        nodeX += parallelSpacingH; // Space out nodes in each row
      }

      positionChildNodes(row.nestedRows, xOffset, yOffset + nodeSpacingV, maxX, parallelSpacingH, nodeSpacingV);

      yOffset += nodeSpacingV; // LF
    }
}


/**
 * Generate label descriptions for big labels at the top of each column
 */
function createBigLabels(columns: Array<NodeColumn>): Array<NodeLabelInfo> {
  const labels: Array<NodeLabelInfo> = [];

  for (const column of columns) {
    const node = column.rows[0].stages[0];
    if (node) {
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
  }

  return labels;
}

/**
 * Generate label descriptions for small labels under the nodes
 */
function createSmallLabels(
  columns: Array<NodeColumn>,
  collasped: boolean
): Array<NodeLabelInfo> {
  const labels: Array<NodeLabelInfo> = [];
  if (collasped) {
    return labels;
  }
  for (const column of columns) {
    for (const row of column.rows) {
      for (const node of row.stages) {
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

        if (node.isPlaceholder === false) {
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
  collasped: boolean
): Array<NodeLabelInfo> {
  const labels: Array<NodeLabelInfo> = [];
  if (collasped) {
    return labels;
  }
  let count = 0;

  for (const column of columns) {
    if (column.hasBranchLabels) {
      for (const row of column.rows) {
        const firstNode = row.stages[0];
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
  collasped: boolean
): Array<CompositeConnection> {
  const connections: Array<CompositeConnection> = [];

  let sourceNodes: Array<NodeInfo> = [];
  let skippedNodes: Array<NodeInfo> = [];

  for (const column of columns) {
    if (column.topStage && column.topStage.state === "skipped") {
      skippedNodes.push(column.rows[0].stages[0]);
      continue;
    }

    connections.push(...createRowConnections(column.rows, sourceNodes, skippedNodes, column.hasBranchLabels, false));

    sourceNodes = column.rows.filter((row) => row.stages.length > 0).map((row) => row.stages[row.stages.length - 1]); // Last node of each row
    skippedNodes = [];
  }

  return connections;
}

function createRowConnections(
  rows: Array<NodeRow>,
  sourceNodes: Array<NodeInfo>,
  skippedNodes: Array<NodeInfo>,
  hasBranchLabels: boolean,
  collasped: boolean
): Array<CompositeConnection> {
  const connections: Array<CompositeConnection> = [];
  // Connections to each row in this column
  if (sourceNodes.length && rows.filter((row) => row.stages.length > 0).length > 0) {
    connections.push({
      sourceNodes,
      destinationNodes: rows.filter((row) => row.stages.length > 0).map((row) => row.stages[0]), // First node of each row
      skippedNodes: skippedNodes,
      hasBranchLabels: hasBranchLabels,
    });
  }

  // Simple horizontal connections between nodes within each row
  for (const row of rows) {
    for (let i = 0; i < row.stages.length - 1; i++) {
      connections.push({
        sourceNodes: [row.stages[i]],
        destinationNodes: [row.stages[i + 1]],
        skippedNodes: [],
        hasBranchLabels: false,
      });
    }
    let rowSourceNodes = rows.filter((row) => row.stages.length > 0).map((row) => row.stages[row.stages.length - 1]); // Last node of each row
    for (const nestedRow of row.nestedRows) {
      connections.push(...createRowConnections(row.nestedRows, rowSourceNodes, [], hasBranchLabels, collasped));
    }
  }

  return connections;
}