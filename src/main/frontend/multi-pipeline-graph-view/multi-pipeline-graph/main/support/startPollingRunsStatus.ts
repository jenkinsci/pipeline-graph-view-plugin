import { RunInfo } from "../MultiPipelineGraphModel.ts";

/**
 * Starts polling the server to retrieve pipeline status.
 * Will only stop once the run is finished.
 */
export default function startPollingRunsStatus(
  pathPrefix: string,
  onFetchSuccess: (data: Array<RunInfo>) => void,
  onFetchError: (err: Error) => void,
  interval = 10000,
) {
  const path = pathPrefix + "multi-pipeline-graph/runs";

  async function fetchPipelineData() {
    try {
      const res = await fetch(path);
      const result = await res.json();
      onFetchSuccess(result.data);
    } catch (err) {
      // TODO: implement exponential backoff of the timeout interval
      onFetchError(err);
    } finally {
      setTimeout(() => fetchPipelineData(), interval);
    }
  }
  fetchPipelineData();
}
