export enum Result {
    success = 'success',
    failure = 'failure',
    running = 'running',
    queued = 'queued',
    paused = 'paused',
    unstable = 'unstable',
    aborted = 'aborted',
    not_built = 'not_built', // May be pending, or job was ended before this point
    skipped = 'skipped', // excluded via pipeline "when" clause
    unknown = 'unknown', // bad data or client code needs updating for new values
}

export function decodeResultValue(resultMaybe: any): Result {
    const lcase = String(resultMaybe).toLowerCase();

    // TODO: validate this
    if ((Object.values(Result) as any).includes(lcase)) {
        return lcase as Result;
    }

    return Result.unknown;
}

// Dimensions used for layout, px
export const defaultLayout = {
    nodeSpacingH: 120,
    parallelSpacingH: 120,
    nodeSpacingV: 70,
    nodeRadius: 12,
    terminalRadius: 7,
    curveRadius: 12,
    connectorStrokeWidth: 3.5,
    labelOffsetV: 20,
    smallLabelOffsetV: 15,
    ypStart: 55,
};

// Typedefs

export type StageType = 'STAGE' | 'PARALLEL' | 'STEP';

/**
 * StageInfo is the input, in the form of an Array<StageInfo> of the top-level stages of a pipeline
 */
export interface StageInfo {
    name: string;
    title: string;
    state: Result;
    completePercent: number;
    id: number;
    type: StageType;
    children: Array<StageInfo>; // Used by the top-most stages with parallel branches
    nextSibling?: StageInfo; // Used within a parallel branch to denote sequential stages
    isSequential?: boolean;
    seqContainerName?: string; //used within a parallel branch to denote the name of the container of the parallel sequential stages
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
    stage: StageInfo;
}

export interface PlaceholderNodeInfo extends BaseNodeInfo {
    // -- Marker
    isPlaceholder: true;

    // -- Unique
    type: 'start' | 'end';
}

export type NodeInfo = StageNodeInfo | PlaceholderNodeInfo;

export interface NodeColumn {
    topStage?: StageInfo; // Top-most stage for this column, which will have no rendered nodes if it's parallel
    rows: Array<Array<NodeInfo>>;
    centerX: number; // Center X position, for positioning top bigLabel
    hasBranchLabels: boolean;
    startX: number; // Where to put the branch labels, or if none, the center of the left-most node(s)
}

export interface CompositeConnection {
    sourceNodes: Array<NodeInfo>;
    destinationNodes: Array<NodeInfo>;
    skippedNodes: Array<NodeInfo>;
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
    nodeColumns: Array<NodeColumn>;
    connections: Array<CompositeConnection>;
    bigLabels: Array<NodeLabelInfo>;
    smallLabels: Array<NodeLabelInfo>;
    branchLabels: Array<NodeLabelInfo>;
    measuredWidth: number;
    measuredHeight: number;
}
