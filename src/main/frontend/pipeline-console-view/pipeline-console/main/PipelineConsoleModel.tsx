// re-export Result so the relative path exists in one location.
export { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

export type {
  StageInfo,
  StageType,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
export * from "../../../common/RestClient.tsx";

export const LOG_FETCH_SIZE = 150 * 1024;
export const POLL_INTERVAL = 1000;
