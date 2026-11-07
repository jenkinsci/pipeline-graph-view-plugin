import type { InputStep } from "../../../common/RestClient.tsx";

export enum Result {
  success = "success",
  failure = "failure",
  running = "running",
  queued = "queued",
  paused = "paused",
  unstable = "unstable",
  aborted = "aborted",
  not_built = "not_built", // May be pending, or job was ended before this point
  skipped = "skipped", // excluded via pipeline "when" clause
  unknown = "unknown", // bad data
}

export interface PendingInput {
  stageId: number;
  stageName: string;
  input: InputStep;
}

// Dimensions used for layout, px
export const defaultLayout = {
  nodeSpacingH: 140,
  parallelSpacingH: 140,
  nodeSpacingV: 70,
  nodeRadius: 14,
  terminalRadius: 10,
  curveRadius: 15,
  connectorStrokeWidth: 2,
  labelOffsetV: 22,
  smallLabelOffsetV: 15,
  ypStart: 55,
  graphSpacingTop: 0,
  graphSpacingRight: 0,
  graphSpacingBottom: 0,
  graphSpacingLeft: 0,
};

// Typedefs

export type StageType =
  "STAGE" | "PARALLEL" | "PARALLEL_BLOCK" | "STEP" | "PIPELINE_START";

/**
 * StageInfo is the input, in the form of an Array<StageInfo> of the top-level stages of a pipeline
 */
export interface StageInfo {
  name: string;
  title: string;
  state: Result;
  id: number;
  type: StageType;
  children: Array<StageInfo>; // Used by the top-most stages with parallel branches
  nextSibling?: StageInfo; // Used within a parallel branch to denote sequential stages
  isSequential?: boolean;
  placeholder?: boolean;
  synthetic?: boolean;
  pauseDurationMillis: number;
  startTimeMillis: number;
  totalDurationMillis?: number; // will be null if the stage is still running
  previousTotalDurationMillis?: number; // populated from previous run, if exists
  agent: string;
  url: string;
  causeOfBlockage?: string; // Set when state is "queued" or "paused" — e.g. "Waiting for next available executor on 'linux'"
  inputStep?: InputStep; // Set when the stage is paused waiting for input
  pendingInputs?: PendingInput[]; // Build history only: input this stage or its nested stages are waiting on

  skeleton?: boolean;
  pauseLiveTotal?: boolean;
  collapsedChildCount?: number; // Set when this stage's children were collapsed away
}

interface BaseNodeInfo {
  key: string;
  x: number;
  y: number;
  id: number;
  name: string;

  // -- Marker
  isPlaceholder: boolean;
}

export interface StageNodeInfo extends BaseNodeInfo {
  // -- Marker
  isPlaceholder: false;

  // -- Unique
  type: "stage";
  stage: StageInfo;
  seqContainerName?: string; // Used within a parallel branch to denote the name of the container of the parallel sequential stages
}

export interface PlaceholderNodeInfo extends BaseNodeInfo {
  // -- Marker
  isPlaceholder: true;

  url?: string;

  // -- Unique
  type: "start" | "end" | "root" | "stage-end";
}

export interface CounterNodeInfo extends BaseNodeInfo {
  // -- Marker
  isPlaceholder: true;

  // -- Unique
  type: "counter";
  stages: StageInfo[];
}

export type NodeInfo = StageNodeInfo | PlaceholderNodeInfo | CounterNodeInfo;

export type GraphNode = {
  children: GraphNode[];
  shiftX: number;
  width: number;
  shiftY: number;
  height: number;
  allChildrenSkipped?: boolean;
  isHidden?: boolean;
  isNestedParallel?: boolean;
  isParallel?: boolean;
  isSkipped?: boolean;
  firstChildIsSkipped?: boolean;
  hasBigLabel?: boolean;
  hasBranchLabel?: boolean;
  hasParallel?: boolean;
  hasSmallLabel?: boolean;
  hasTiming?: boolean;
  hasStageEnd?: boolean;
} & NodeInfo;

export interface NodeColumn {
  topStage?: StageInfo; // Top-most stage for this column, which will have no rendered nodes if it's parallel
  rows: Array<Array<NodeInfo>>;
  centerX: number; // Center X position, for positioning top bigLabel
  hasBranchLabels: boolean;
  startX: number; // Where to put the branch labels, or if none, the center of the left-most node(s)
}

export interface ConnectionEdge {
  x: number;
  y: number;
  key: string;
  firstChildIsSkipped?: boolean;
  isHidden?: boolean;
  isPlaceholder?: boolean;
  isSkipped?: boolean;

  allChildrenSkipped?: boolean;
  height?: number;
  width?: number;
}

export interface CompositeConnection {
  sourceNodes: Array<ConnectionEdge>;
  destinationNodes: Array<ConnectionEdge>;
  skippedNodes: Array<ConnectionEdge>;
  hasBranchLabels: boolean;
}

export interface NodeLabelInfo {
  x: number;
  y: number;
  text: string;
  key: string;
  stage?: StageInfo;
  node: NodeInfo;
}

export type LayoutInfo = typeof defaultLayout;

/**
 * The result of the graph layout algorithm
 */
export interface PositionedGraph {
  nodes: Array<NodeInfo>;
  allNodes: Array<GraphNode>;
  connections: Array<CompositeConnection>;
  bigLabels: Array<NodeLabelInfo>;
  timings: Array<NodeLabelInfo>;
  smallLabels: Array<NodeLabelInfo>;
  branchLabels: Array<NodeLabelInfo>;
  measuredWidth: number;
  measuredHeight: number;
}

// Optionally turn on debugging for the graph. Use a constant to let tree-shaking remove the debug code in production bundles.
export const debugPipelineGraph = false;
