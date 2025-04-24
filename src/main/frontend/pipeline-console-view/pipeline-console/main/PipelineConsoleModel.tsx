// re-export Result so the relative path exists in one location.
export { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

export type {
  StageInfo,
  StageType,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
export * from "../../../common/RestClient";

export const LOG_FETCH_SIZE = 150 * 1024;
export const POLL_INTERVAL = 1000;
