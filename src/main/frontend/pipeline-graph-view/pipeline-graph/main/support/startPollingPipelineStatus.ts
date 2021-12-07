import { StageInfo } from "../PipelineGraphModel";

interface ApiResult {
  complete: boolean;
  stages: Array<StageInfo>;
}

/**
 * Starts polling the server to retrieve pipeline status.
 * Will only stop once the run is finished.
 */
export default function startPollingPipelineStatus(
  onFetchSuccess: (data: ApiResult) => void,
  onFetchError: (err: Error) => void,
  onPipelineComplete: () => void,
  path: string,
  interval = 3000
) {
  let isComplete = false;

  async function fetchPipelineData() {
    try {
      const res = await fetch(path);
      const result = await res.json();
      onFetchSuccess(result.data);
      isComplete = result.data.complete;
    } catch (err) {
      // TODO: implement exponential backoff of the timeout interval
      onFetchError(err);
    } finally {
      if (isComplete) {
        onPipelineComplete();
      } else {
        setTimeout(() => fetchPipelineData(), interval);
      }
    }
  }
  fetchPipelineData();
}
