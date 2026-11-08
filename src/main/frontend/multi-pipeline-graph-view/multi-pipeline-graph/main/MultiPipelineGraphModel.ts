import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

export interface RunInfo {
  id: string;
  displayName: string;
  timestamp: number;
  duration: number;
  changesCount: number;
  result: Result;
  /** Whether the run is still going, even once it has a result such as unstable. */
  building: boolean;
}
