import { Result } from "../../../pipeline-graph-view/pipeline-graph/main";

export interface RunInfo {
  id: string;
  displayName: string;
  timestamp: number;
  duration: number;
  result: Result;
}
