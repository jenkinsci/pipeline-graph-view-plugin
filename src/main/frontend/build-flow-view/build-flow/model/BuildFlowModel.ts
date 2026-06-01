export interface BuildFlowNodeModel {
  id: string;
  jobName: string;
  jobFullName: string;
  buildNumber: number;
  displayName: string;
  url: string;
  status:
    | "SUCCESS"
    | "FAILURE"
    | "UNSTABLE"
    | "ABORTED"
    | "IN_PROGRESS"
    | "NOT_BUILT"
    | "QUEUED";
  durationMs?: number | null;
  startTimeMs?: number | null;
  description?: string | null;
  isCurrentBuild: boolean;
  recentResults?: string[] | null;
}

export interface BuildFlowEdgeModel {
  from: string;
  to: string;
}

export interface BuildFlowResponseModel {
  nodes: BuildFlowNodeModel[];
  edges: BuildFlowEdgeModel[];
  isAnyBuildOngoing: boolean;
  isTruncated?: boolean;
}
