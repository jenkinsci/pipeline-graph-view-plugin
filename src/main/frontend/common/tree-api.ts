import { useEffect, useState } from "react";
import { getRunStatusFromPath } from "./RestClient";
import { StageInfo } from "../pipeline-graph-view/pipeline-graph/main";
import startPollingPipelineStatus from "../pipeline-graph-view/pipeline-graph/main/support/startPollingPipelineStatus";
import { mergeStageInfos } from "./utils/stage-merge";

/**
 * Polls a run, stopping once the run has completed
 * Optionally retrieves data from the prior run and overlays the new run on top
 */
export default function useRunPoller({
  currentRunPath,
  previousRunPath,
}: RunPollerProps) {
  const [run, setRun] = useState<Run>();

  useEffect(() => {
    if (previousRunPath) {
      getRunStatusFromPath(previousRunPath).then((r) => {
        // This should be a Result - not 'complete'
        const onPipelineDataReceived = (data: {
          stages: StageInfo[];
          complete: boolean;
        }) => {
          setRun({
            stages: mergeStageInfos(r!.stages, data.stages),
          });
        };

        const onPollingError = (err: Error) => {
          console.log(
            "There was an error when polling the pipeline status",
            err,
          );
        };

        const onPipelineComplete = () => undefined;

        startPollingPipelineStatus(
          onPipelineDataReceived,
          onPollingError,
          onPipelineComplete,
          currentRunPath,
        );
      });
    } else {
      const onPipelineDataReceived = (data: { stages: StageInfo[] }) => {
        setRun({
          stages: data.stages,
        });
      };

      const onPollingError = (err: Error) => {
        console.log("There was an error when polling the pipeline status", err);
      };

      const onPipelineComplete = () => undefined;

      startPollingPipelineStatus(
        onPipelineDataReceived,
        onPollingError,
        onPipelineComplete,
        currentRunPath,
      );
    }
  }, []);

  return {
    run,
  };
}

interface Run {
  stages: StageInfo[];
}

interface RunPollerProps {
  currentRunPath: string;
  previousRunPath?: string;
}
