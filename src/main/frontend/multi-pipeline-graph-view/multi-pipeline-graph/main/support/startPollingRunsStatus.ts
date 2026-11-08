import { RunInfo } from "../MultiPipelineGraphModel.ts";

/**
 * Polls the job's recent runs until the returned function is called. The runs are only passed on
 * when they've changed, so an unchanged job doesn't re-render every poll.
 *
 * @param limit how many of the most recent runs to fetch, the server's default when not given
 * @returns stops polling
 */
export default function startPollingRunsStatus(
  pathPrefix: string,
  onFetchSuccess: (data: Array<RunInfo>) => void,
  onFetchError: (err: Error) => void,
  interval = 10000,
  limit?: number,
): () => void {
  const path =
    pathPrefix +
    "multi-pipeline-graph/runs" +
    (limit === undefined ? "" : `?limit=${limit}`);
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let previous: string | undefined;

  async function fetchPipelineData() {
    try {
      const res = await fetch(path);
      const text = await res.text();
      if (!stopped && text !== previous) {
        previous = text;
        onFetchSuccess(JSON.parse(text).data);
      }
    } catch (err) {
      // TODO: implement exponential backoff of the timeout interval
      onFetchError(err as Error);
    } finally {
      if (!stopped) {
        timeout = setTimeout(() => fetchPipelineData(), interval);
      }
    }
  }
  fetchPipelineData();

  return () => {
    stopped = true;
    clearTimeout(timeout);
  };
}
