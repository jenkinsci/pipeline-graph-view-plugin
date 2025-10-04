import {
  getRunStatusFromPath,
  RunStatus,
} from "../../../../common/RestClient.tsx";
/**
 * Starts polling the server to retrieve pipeline status.
 * Will only stop once the run is finished.
 */
export default async function startPollingPipelineStatus(
  onFetchSuccess: (data: RunStatus) => void,
  onFetchError: (err: Error) => void,
  onPipelineComplete: () => void,
  path: string,
  interval = 3000,
) {
  let isComplete = false;
  let lastResult = "";

  async function fetchPipelineData() {
    try {
      const result = await getRunStatusFromPath(path)!;
      if (result.raw !== lastResult) {
        onFetchSuccess(result);
        lastResult = result.raw ?? "";
      }
      isComplete = result!.complete;
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
