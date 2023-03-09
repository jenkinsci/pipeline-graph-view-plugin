import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

// re-export Result so the relative path exists in one location.
export {
  Result,
  decodeResultValue,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

export { getGroupForResult } from "../../../pipeline-graph-view/pipeline-graph/main/support/StatusIcons";

//export { default as StepStatus } from "../../../step-status/StepStatus";

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
  consoleLines: string[];
  consoleStartByte: number;
  consoleEndByte: number;
}

export interface ConsoleLogData {
  text: string;
  startByte: number;
  endByte: number;
  stepId: number;
}

export const LOG_FETCH_SIZE = 150 * 1024;
