import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

/**
 * StageInfo is the input, in the form of an Array<StageInfo> of the top-level stages of a pipeline
 */
export interface StepInfo {
  name: string;
  title: string;
  state: Result;
  completePercent: number;
  id: number;
  type: string;
  stageId: string;
  pauseDurationMillis: string;
  startTimeMillis: string;
  totalDurationMillis: string;
  consoleText: string;
}
