import { useCallback, useRef } from "react";

import { getRunStatusFromPath, RunStatus } from "./RestClient.tsx";
import { mergeStageInfos } from "./utils/stage-merge.ts";
import { usePolling } from "./utils/use-polling.ts";

/**
 * Polls a run, stopping once the run has completed
 * Optionally retrieves data from the prior run and overlays the new run on top
 */
export default function useRunPoller({
  currentRunPath,
  previousRunPath,
  interval = 3000,
}: RunPollerProps) {
  const previousRun = useRef<RunStatus>(null);
  const postProcess = useCallback(
    async (nextRun: RunStatus) => {
      if (!previousRunPath || nextRun.complete) {
        return nextRun;
      }
      if (!previousRun.current) {
        try {
          previousRun.current = await getRunStatusFromPath(previousRunPath);
        } catch (err) {
          console.error("Fetch previous run", err);
          return nextRun;
        }
      }
      return {
        stages: mergeStageInfos(previousRun.current.stages, nextRun.stages),
        complete: false,
      };
    },
    [previousRunPath],
  );
  const fetchCurrentRun = useCallback(
    () => getRunStatusFromPath(currentRunPath),
    [currentRunPath],
  );
  const { data: run, loading } = usePolling<RunStatus>(
    fetchCurrentRun,
    interval,
    "complete",
    { stages: [], complete: false },
    postProcess,
  );

  return {
    run,
    loading,
  };
}

interface RunPollerProps {
  currentRunPath: string;
  previousRunPath?: string;
  interval?: number;
}
