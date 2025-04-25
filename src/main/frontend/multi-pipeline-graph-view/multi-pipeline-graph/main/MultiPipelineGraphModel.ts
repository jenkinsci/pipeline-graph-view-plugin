import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/index.js";

export interface RunInfo {
  id: string;
  displayName: string;
  timestamp: number;
  duration: number;
  result: Result;
}
