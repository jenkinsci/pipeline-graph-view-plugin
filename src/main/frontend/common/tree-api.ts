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
    const onPipelineComplete = () => undefined;

    if (previousRunPath) {
      getRunStatusFromPath(previousRunPath).then((r) => {
        // This should be a Result - not 'complete'
        const onPipelineDataReceived = (data: {
          stages: StageInfo[];
          complete: boolean;
        }) => {
          setRun({
            stages: mergeStageInfos(r!.stages, data.stages),
            complete: data.complete,
          });
        };

        const onPollingError = (err: Error) => {
          console.log(
            "There was an error when polling the pipeline status",
            err,
          );
        };

        startPollingPipelineStatus(
          onPipelineDataReceived,
          onPollingError,
          onPipelineComplete,
          currentRunPath,
        );
      });
    } else {
      const onPipelineDataReceived = (data: {
        stages: StageInfo[];
        complete: boolean;
      }) => {
        setRun({
          stages: data.stages,
          complete: data.complete,
        });
      };

      const onPollingError = (err: Error) => {
        console.log("There was an error when polling the pipeline status", err);
      };

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
  complete: boolean;
}

interface RunPollerProps {
  currentRunPath: string;
  previousRunPath?: string;
}
