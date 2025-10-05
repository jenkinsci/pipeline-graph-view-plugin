import { useEffect, useState } from "react";

import startPollingPipelineStatus from "../pipeline-graph-view/pipeline-graph/main/support/startPollingPipelineStatus.ts";
import { getRunStatusFromPath, RunStatus } from "./RestClient.tsx";
import { mergeStageInfos } from "./utils/stage-merge.ts";

const onPollingError = (err: Error) =>
  console.log("There was an error when polling the pipeline status", err);

/**
 * Polls a run, stopping once the run has completed
 * Optionally retrieves data from the prior run and overlays the new run on top
 */
export default function useRunPoller({
  currentRunPath,
  previousRunPath,
  interval = 3000,
}: RunPollerProps) {
  const [run, setRun] = useState<RunStatus>({ stages: [], complete: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let onPipelineDataReceived: (data: RunStatus) => void;
    if (previousRunPath) {
      let previousRun: RunStatus | null = null;
      onPipelineDataReceived = async (current: RunStatus) => {
        setLoading(false);
        if (current.complete) {
          setRun(current);
        } else {
          if (previousRun == null) {
            // only set the previous run if it is not yet set
            try {
              previousRun = await getRunStatusFromPath(previousRunPath);
            } catch (err) {
              console.error("Fetch previous run", err);
            }
          }
          // error getting previous run
          if (previousRun == null) {
            setRun(current);
          } else {
            setRun({
              stages: mergeStageInfos(previousRun!.stages, current.stages),
              complete: false,
            });
          }
        }
      };
    } else {
      onPipelineDataReceived = (data: RunStatus) => {
        setLoading(false);
        setRun(data);
      };
    }
    startPollingPipelineStatus(
      onPipelineDataReceived,
      onPollingError,
      () => setLoading(false),
      currentRunPath,
      interval,
    );
  }, [currentRunPath, previousRunPath, interval]);

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
