import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

// re-export Result so the relative path exists in one location.
export {
  Result,
  decodeResultValue,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

export type {
  StageInfo,
  StageType,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
export { default as startPollingPipelineStatus } from "../../../pipeline-graph-view/pipeline-graph/main/support/startPollingPipelineStatus";
export { pollUntilComplete } from "../../../common/Poller";
export { getSymbolForResult } from "../../../pipeline-graph-view/pipeline-graph/main/support/StatusIcons";
export * from "../../../common/RestClient";

export const LOG_FETCH_SIZE = 150 * 1024;
export const POLL_INTERVAL = 1000;
