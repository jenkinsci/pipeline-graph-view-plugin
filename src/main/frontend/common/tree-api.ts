import { useEffect, useState } from "react";
import { getRunStatusFromPath } from "./RestClient";
import { StageInfo } from "../pipeline-graph-view/pipeline-graph/main";
import startPollingPipelineStatus from "../pipeline-graph-view/pipeline-graph/main/support/startPollingPipelineStatus";
import PreviousRunThing from "../pipeline-graph-view/pipeline-graph/main/support/PreviousRunThing";

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
            stages: mergeStageInfos(markSkeleton(r!.stages), data.stages),
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

export const markSkeleton = (stages: StageInfo[]): StageInfo[] =>
  stages.map((s) => ({
    ...s,
    skeleton: true,
    completePercent: 0,
    children: markSkeleton(s.children ?? []),
  }));

export const mergeStageInfos = (
  skeletons: StageInfo[],
  incoming: StageInfo[],
): StageInfo[] => {
  const previous: PreviousRunThing = new PreviousRunThing(skeletons);
  const merged = incoming.map((incomingItem) => {
    const match = skeletons.find((s) => s.name === incomingItem.name);

    return {
      ...(match ?? {}),
      ...incomingItem,
      skeleton: false,
      completePercent: previous.estimateCompletion(incomingItem),
      children: mergeStageInfos(
        match?.children ?? [],
        incomingItem.children ?? [],
      ),
    };
  });

  const unmatchedSkeletons = skeletons.filter(
    (s) => !incoming.some((i) => i.name === s.name),
  );

  return [...merged, ...unmatchedSkeletons];
};

export const stripSkeleton = (stage: StageInfo): StageInfo => ({
  ...stage,
  skeleton: false,
  completePercent: 0,
  children: stage.children?.map(stripSkeleton) ?? [],
});
