import { LocalizedMessageKey, Messages } from "../../../common/i18n/index.ts";
import {
  CompositeConnection,
  ConnectionEdge,
  debugPipelineGraph,
  GraphNode,
  LayoutInfo,
  NodeLabelInfo,
  PositionedGraph,
  Result,
  StageInfo,
} from "./PipelineGraphModel.tsx";

export const DEFAULT_MAX_COLUMNS_WHEN_COLLAPSED = 13;

export function nestedGraphLayout(
  stages: Array<StageInfo>,
  layout: LayoutInfo,
  collapsed: boolean,
  messages: Messages,
  showNames: boolean,
  showDurations: boolean,
  maxColumnsWhenCollapsed: number = DEFAULT_MAX_COLUMNS_WHEN_COLLAPSED,
): PositionedGraph {
  const graphSpacingX = layout.nodeSpacingH / 2;
  const startEndReducedSpacing = Math.floor(layout.nodeSpacingH * 0.3);
  const root: GraphNode = {
    ...baseGraphNode(layout),
    shiftX: graphSpacingX,
    isPlaceholder: true,
    isHidden: true,
    type: "root",
    name: "Root",
    key: "root",
    id: -42,
    children: [
      {
        ...baseGraphNode(layout, showNames),
        width: layout.nodeSpacingH - startEndReducedSpacing,
        isPlaceholder: true,
        type: "start",
        name: messages.format(LocalizedMessageKey.start),
        key: "start-node",
        id: -1,
      },
    ],
  };

  if (collapsed) {
    buildGraphCollapsed(
      stages,
      root,
      layout,
      showNames,
      showDurations,
      maxColumnsWhenCollapsed,
    );
  } else {
    buildGraphNested(root, stages, layout, false);
  }

  root.y = Math.max(
    layout.ypStart,
    root.shiftY + (showNames ? layout.nodeRadius + layout.labelOffsetV : 0),
  );
  root.children.push({
    ...baseGraphNode(layout, showNames),
    width: graphSpacingX,
    shiftX: -startEndReducedSpacing,
    isPlaceholder: true,
    type: "end",
    name: messages.format(LocalizedMessageKey.end),
    key: "end-node",
    id: -3,
  });
  root.width =
    root.shiftX + sumGraphNodeProp(root, "width") - startEndReducedSpacing;
  const measuredWidth = root.width;
  const measuredHeight = root.y + root.height;

  computePositions(root, 0, layout);
  const connections = computeConnections(root);
  const nodes = flattenGraph(root);
  const visibleNodes = nodes.filter((node) => !node.isHidden);
  const smallLabels = computeSmallLabels(nodes);
  const branchLabels = computeBranchLabels(nodes, layout);
  const bigLabels = computeBigLabels(nodes, layout);
  const timings = computeTimingsLabels(nodes, layout);

  const debug = debugPipelineGraph();
  if (debug) printDebugInfo(stages, root, nodes, connections);
  return {
    nodes: debug ? nodes : visibleNodes,
    allNodes: nodes,
    connections,
    smallLabels,
    bigLabels,
    branchLabels,
    timings,
    measuredWidth,
    measuredHeight,
  };
}

function flattenGraph(node: GraphNode): GraphNode[] {
  return [node, ...node.children.flatMap(flattenGraph)];
}

function floorToMultipleOf(n: number, multiple: number): number {
  return Math.floor(n / multiple) * multiple;
}

function roundToMultipleOf(n: number, multiple: number): number {
  return Math.round(n / multiple) * multiple;
}

function centerOfNode(node: GraphNode, layout: LayoutInfo) {
  return (
    node.x +
    roundToMultipleOf(
      (node.width - (node.hasStageEnd ? layout.nodeSpacingH / 2 : 0)) / 2,
      layout.nodeSpacingH / 2,
    ) -
    layout.nodeSpacingH / 2
  );
}

function sumGraphNodeProp(
  node: GraphNode,
  prop: "width" | "shiftY" | "height" | "shiftX",
): number {
  return node.children.reduce((sum, c) => sum + c[prop], 0);
}

function maxGraphNodeProp(
  node: GraphNode,
  prop: "width" | "shiftY" | "height" | "shiftX",
): number {
  return Math.max(node[prop], ...node.children.map((c) => c[prop]));
}

function collectCollapsedStages(
  collapsedStages: StageInfo[],
  stages: StageInfo[],
  level: number,
) {
  for (const stage of stages) {
    if (
      (!(stage.children.length > 0 && stage.children[0].type === "PARALLEL") &&
        !(stage.type === "PARALLEL" && stage.children.length > 0)) ||
      (level > 1 && stage.type !== "PARALLEL_BLOCK")
    ) {
      // Mirror filtering of old layout:
      // - Top level: Hide stages that wrap "PARALLEL" stages.
      // - Top level: Hide "PARALLEL" stages with children.
      // - Rest: Hide generic "PARALLEL_BLOCK" wrapper.
      collapsedStages.push(stage);
    }
    collectCollapsedStages(collapsedStages, stage.children, level + 1);
  }
}

function buildGraphCollapsed(
  stages: StageInfo[],
  root: GraphNode,
  layout: LayoutInfo,
  showNames: boolean,
  showDurations: boolean,
  maxColumnsWhenCollapsed: number,
) {
  const collapsedStages: StageInfo[] = [];
  collectCollapsedStages(collapsedStages, stages, 0);

  const breakPoint =
    collapsedStages.length > maxColumnsWhenCollapsed
      ? maxColumnsWhenCollapsed - 1 // Make space for counter node.
      : collapsedStages.length;
  root.children.push(
    ...collapsedStages.slice(0, breakPoint).map((stage: StageInfo) => ({
      ...makeNodeForStage(stage, layout, showNames),
      hasTiming: showDurations,
    })),
  );
  if (collapsedStages.length > breakPoint) {
    root.children.push({
      ...baseGraphNode(layout),
      isPlaceholder: true,
      type: "counter",
      name: "Counter",
      key: "counter-node",
      id: -2,
      stages: collapsedStages.slice(breakPoint),
    });
  }
}

function buildGraphNested(
  node: GraphNode,
  stages: StageInfo[],
  layout: LayoutInfo,
  isLast: boolean,
) {
  if (node.isSkipped || stages.length === 0) return;
  for (let [idx, stage] of stages.entries()) {
    const isLast = idx === stages.length - 1;
    const isParallel = stage.type === "PARALLEL";
    const hasChildren = stage.children.length > 0;
    let hasParallel = hasChildren && stage.children[0].type === "PARALLEL";
    if (isParallel && hasParallel) {
      // Turn PARALLEL -> PARALLEL into PARALLEL -> PARALLEL_BLOCK -> PARALLEL.
      // This allows for a stage-end node to be inserted after the parallel children.
      // PARALLEL[PARALLEL, ...] -> PARALLEL[PARALLEL_BLOCK[PARALLEL, ...],stage-end]
      // Which in turn lets us connect the nested parallel children together before connecting the stage-end to the parents next node.
      stage = {
        ...stage,
        id: -stage.id,
        children: [{ ...stage, type: "PARALLEL_BLOCK" }],
      };
      hasParallel = false;
    }
    const isChainedParallel =
      isParallel &&
      stage.children.length === 1 &&
      stage.children[0].children.length > 0 &&
      stage.children[0].children[0].type === "PARALLEL" &&
      stage.name === stage.children[0].name;
    const isSkipped = stage.state === Result.skipped;
    const firstChildIsSkipped =
      hasChildren && stage.children[0].state === Result.skipped;

    const hasBranchLabel =
      isParallel &&
      hasChildren &&
      // Do not add a branch label on the parent of a nested parallel. Instead, show a big label on the nested parallel block.
      !isChainedParallel;
    const isHidden = hasBranchLabel || hasParallel || isChainedParallel;
    const hasBigLabel =
      hasParallel ||
      (stage.type === "STAGE" && hasChildren && !hasBranchLabel) ||
      // Do not add a big label to parallel skipped stages. Only use one when we show a "skipped", curved connection.
      (isSkipped && !isParallel);
    const hasSmallLabel = !isHidden && !hasBigLabel;
    const childNode: GraphNode = {
      ...makeNodeForStage(stage, layout),
      isParallel,
      isSkipped,
      isHidden,
      hasParallel,
      hasBranchLabel,
      hasBigLabel,
      hasSmallLabel,
      firstChildIsSkipped,
    };
    buildGraphNested(childNode, stage.children, layout, isLast);
    if (hasBigLabel) childNode.shiftY += layout.labelOffsetV;
    if (
      isChainedParallel ||
      (childNode.hasParallel &&
        childNode.children.some((c) => c.hasBranchLabel))
    ) {
      // - Nested parallel children, avoid collapsing curves.
      // - Any child has branch label, make space for branch label.
      childNode.shiftX += layout.nodeSpacingH;
      childNode.width += layout.nodeSpacingH;
    }
    node.children.push(childNode);
  }
  if (node.hasParallel) {
    // Move shiftY from first parallel child up one level.
    const inheritedShift = node.children[0].shiftY;
    node.shiftY = inheritedShift;
    node.width = maxGraphNodeProp(node, "width");
    node.height =
      sumGraphNodeProp(node, "height") +
      sumGraphNodeProp(node, "shiftY") -
      inheritedShift;
  } else {
    node.width = sumGraphNodeProp(node, "width");
    node.height = maxGraphNodeProp(node, "height");
    node.shiftY = maxGraphNodeProp(node, "shiftY");
  }
  const last = node.children[node.children.length - 1];
  node.hasStageEnd =
    !node.hasParallel &&
    (isLast || node.isParallel) &&
    (last.isSkipped || last.hasParallel);
  if (node.hasStageEnd) {
    // - Add a dummy node to "close" the skipped curve before closing the stage.
    // - Add a dummy node to "close" the parallel curve of the child.
    // In both cases, the dummy node will be the new stage end that is connected to the next node.
    node.width += layout.nodeSpacingH / 2;
    node.children.push({
      ...baseGraphNode(layout),
      shiftX: -layout.nodeSpacingH / 2,
      width: layout.nodeSpacingH,
      isPlaceholder: true,
      type: "stage-end",
      key: `stage_end_${node.key}`,
      name: `Stage end (${node.name})`,
      id: 1_000_000 + node.id,
      isHidden: true,
    });
  }
}

function computePositions(
  node: GraphNode,
  extraXp: number,
  layout: LayoutInfo,
) {
  if (node.children.length === 0) return;
  extraXp += node.shiftX;
  let xP = node.x + extraXp;
  let yP = node.y;
  for (const [i, child] of node.children.entries()) {
    child.x = xP;
    child.y = yP;
    let childExtraXp = 0;
    if (node.hasParallel) {
      if (i > 0) {
        // Skip first child: The entire node has been moved already by children[0].shiftY.
        child.y += child.shiftY;
        yP += child.shiftY;
      }
      yP += child.height;
      // Shift small children close to center, prefer closer to start than end.
      childExtraXp = floorToMultipleOf(
        (node.width - extraXp - child.width) / 2,
        layout.nodeSpacingH,
      );
      if (child.children.length === 0) {
        child.x += childExtraXp;
        childExtraXp = 0;
      }
    } else {
      xP += child.width;
      if (child.shiftX < 0) {
        xP += child.shiftX;
        child.x += child.shiftX;
      }
    }
    computePositions(child, childExtraXp, layout);
  }
}

function computeConnections(node: GraphNode): CompositeConnection[] {
  const connections: CompositeConnection[] = [];
  computeTailNodes(connections, node);
  return connections;
}

function computeTailNodes(
  connections: CompositeConnection[],
  node: GraphNode,
): GraphNode[] {
  if (node.children.length === 0) {
    return [node];
  }
  if (node.hasParallel) {
    return node.children.flatMap((child) =>
      computeTailNodes(connections, child),
    );
  }
  // Collect nodes in a Set. With two skipped nodes next to each other, we need to deduplicate them.
  const sourceNodes = new Set<GraphNode>();
  const skippedNodes = new Set<GraphNode>();
  const connect = (
    tailNodes: GraphNode[],
    destination: GraphNode,
    ignoreSkipped?: boolean,
  ) => {
    for (const node of tailNodes) {
      if (ignoreSkipped || !node.isSkipped) {
        sourceNodes.add(node);
      } else {
        skippedNodes.add(node);
      }
    }
    const destinationNodes = destination.hasParallel
      ? destination.children // Connect directly to parallel children
      : [destination];
    if (!destinationNodes.some((n) => !n.isSkipped)) {
      for (const node of destinationNodes) skippedNodes.add(node);
      return;
    }
    connections.push({
      sourceNodes: Array.from(sourceNodes),
      destinationNodes,
      skippedNodes: Array.from(skippedNodes),
      hasBranchLabels: destinationNodes.some((n) => n.hasBranchLabel),
    });
    sourceNodes.clear();
    skippedNodes.clear();
  };
  if (node.type !== "root") {
    connect([node], node.children[0], true);
  }
  for (let i = 0; i < node.children.length - 1; i++) {
    const childA = node.children[i];
    const childB = node.children[i + 1];
    connect(
      computeTailNodes(connections, childA),
      childB,
      // Honor skipped state per layer, but not across layers.
      childA.hasParallel,
    );
  }
  const last = node.children[node.children.length - 1];
  if (last.isSkipped || skippedNodes.size > 0 || sourceNodes.size > 0) {
    throw new Error("bug: buildGraphNested did not add trailing dummy node");
  }
  return computeTailNodes(connections, last);
}

function computeSmallLabels(visibleNodes: GraphNode[]) {
  return visibleNodes
    .filter((node) => node.hasSmallLabel)
    .map((node): NodeLabelInfo => {
      return {
        x: node.x,
        y: node.y,
        text: node.name,
        key: "l_small_" + node.key,
        node,
        stage: "stage" in node ? node.stage : undefined,
      };
    });
}

function computeBranchLabels(nodes: GraphNode[], layout: LayoutInfo) {
  return nodes
    .filter((node) => node.hasBranchLabel)
    .map((node): NodeLabelInfo => {
      return {
        x: node.x - layout.nodeSpacingH,
        y: node.y,
        key: "l_branch_" + node.key,
        node,
        text: node.name,
      };
    });
}

function computeBigLabels(nodes: GraphNode[], layout: LayoutInfo) {
  return nodes
    .filter((node) => node.hasBigLabel)
    .map((node): NodeLabelInfo => {
      return {
        x: centerOfNode(node, layout),
        y: node.y - (node.shiftY - layout.labelOffsetV),
        key: "l_big_" + node.key,
        node,
        stage: "stage" in node ? node.stage : undefined,
        text: node.name,
      };
    });
}

function computeTimingsLabels(nodes: GraphNode[], layout: LayoutInfo) {
  return nodes
    .filter((node) => node.hasTiming)
    .map((node): NodeLabelInfo => {
      return {
        x: centerOfNode(node, layout),
        y: node.y + 55,
        node,
        stage: "stage" in node ? node.stage : undefined,
        text: "", // we take the duration from the stage itself at render time
        key: `l_t_${node.key}`,
      };
    });
}

function baseGraphNode(layout: LayoutInfo, hasBigLabel?: boolean) {
  return {
    children: [],
    x: 0,
    y: 0,
    shiftX: 0,
    shiftY: 0,
    width: layout.nodeSpacingH,
    height: layout.nodeSpacingV,
    ...(hasBigLabel ? { shiftY: layout.labelOffsetV, hasBigLabel: true } : {}),
  };
}

function makeNodeForStage(
  stage: StageInfo,
  layout: LayoutInfo,
  hasBigLabel?: boolean,
): GraphNode {
  return {
    ...baseGraphNode(layout, hasBigLabel),
    name: stage.name,
    id: stage.id,
    type: "stage",
    stage,
    isPlaceholder: false,
    key: "n_" + stage.id,
  };
}

function printDebugInfo(
  newStages: Array<StageInfo>,
  root: GraphNode,
  nodes: GraphNode[],
  connections: CompositeConnection[],
) {
  console.log("JSON.stringify(newStages)", JSON.stringify(newStages));
  console.log(
    "For test snapshot",
    JSON.stringify(
      newStages.map(function forTestSnapshot(stage: StageInfo): any {
        return {
          name: stage.name,
          state: stage.state,
          id: stage.id,
          type: stage.type,
          children: stage.children.map(forTestSnapshot),
        };
      }),
    ),
  );
  console.log("newStages", newStages);
  for (const node of nodes) {
    removeFalseOptionalGraphNodeFlags(node);
  }
  console.log("graph root", root);
  console.table(
    nodes.map((n) => ({ ...n, stage: "stage" in n && n.stage.type })),
    [
      "width",
      "height",
      "shiftY",
      "shiftX",
      "x",
      "y",
      "key",
      "type",
      "hasParallel",
      "hasBranchLabel",
      "stage",
      "name",
    ],
  );

  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const joinEdges = (ee: ConnectionEdge[]) =>
    ee.map((e) => `${e.key} (${byKey.get(e.key)?.name})`).join(",");
  console.table(
    connections.map((c) => ({
      sourceNodes: joinEdges(c.sourceNodes),
      destinationNodes: joinEdges(c.destinationNodes),
      skippedNodes: joinEdges(c.skippedNodes),
      hasBranchLabels: c.hasBranchLabels,
    })),
  );
}

export function removeFalseOptionalGraphNodeFlags(node: GraphNode) {
  if (!node.firstChildIsSkipped) delete node.firstChildIsSkipped;
  if (!node.hasBigLabel) delete node.hasBigLabel;
  if (!node.hasBranchLabel) delete node.hasBranchLabel;
  if (!node.hasParallel) delete node.hasParallel;
  if (!node.hasSmallLabel) delete node.hasSmallLabel;
  if (!node.hasStageEnd) delete node.hasStageEnd;
  if (!node.isHidden) delete node.isHidden;
  if (!node.isParallel) delete node.isParallel;
  if (!node.isSkipped) delete node.isSkipped;

  for (const [key, value] of Object.entries(node)) {
    if (key === "isPlaceholder") continue; // isPlaceholder is required.
    if (value === false) {
      throw new Error(`Bug: Missed false flag: ${key} on node`);
    }
  }
}
