// re-export Result so the relative path exists in one location.
export {
  Result,
  decodeResultValue,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

export type {
  StageInfo,
  StageType,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
export { pollUntilComplete } from "../../../common/Poller";
export * from "../../../common/RestClient";

export const LOG_FETCH_SIZE = 150 * 1024;
export const POLL_INTERVAL = 1000;
