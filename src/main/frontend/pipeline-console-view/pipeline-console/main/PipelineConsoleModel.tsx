// re-export Result so the relative path exists in one location.
export { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.js";

export type {
  StageInfo,
  StageType,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.js";
export * from "../../../common/RestClient.js";

export const LOG_FETCH_SIZE = 150 * 1024;
export const POLL_INTERVAL = 1000;
