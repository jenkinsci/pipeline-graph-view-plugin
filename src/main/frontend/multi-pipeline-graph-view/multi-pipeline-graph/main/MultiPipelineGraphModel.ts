import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/index.ts";

export interface RunInfo {
  id: string;
  displayName: string;
  timestamp: number;
  duration: number;
  result: Result;
}
