import { useEffect, useState } from "react";
import { getRunStatusFromPath } from "./RestClient";
import { Result, StageInfo } from "../pipeline-graph-view/pipeline-graph/main";
import startPollingPipelineStatus from "../pipeline-graph-view/pipeline-graph/main/support/startPollingPipelineStatus";
import PreviousRunThing from "../pipeline-graph-view/pipeline-graph/main/support/PreviousRunThing";

/**
 *
 */
export default function useLewis({ path, previousPath }: LewisProps) {
  const [run, setRun] = useState<Run>();

  useEffect(() => {
    if (previousPath) {
      getRunStatusFromPath(previousPath).then((r) => {
        // This should be a Result - not 'complete'
        const onPipelineDataReceived = (data: {
          stages: StageInfo[];
          complete: boolean;
        }) => {
          setRun({
            status: Result.success,
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
          path + "pipeline-graph/tree",
        );
      });
    } else {
      const onPipelineDataReceived = (data: { stages: StageInfo[] }) => {
        setRun({
          status: Result.success,
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
        path + "pipeline-graph/tree",
      );
    }
  }, []);

  return {
    run,
  };
}

interface Run {
  status: Result;
  stages: StageInfo[];
}

interface LewisProps {
  path: string;
  previousPath?: string;
}

export const markSkeleton = (stages: StageInfo[]): StageInfo[] =>
  stages.map((s) => ({
    ...s,
    skeleton: true,
    completePercent: 0, // TODO - verify we need
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

// Optional helper: strip skeleton flags from incoming before replacing
export const stripSkeleton = (stage: StageInfo): StageInfo => ({
  ...stage,
  skeleton: false,
  completePercent: 0,
  children: stage.children?.map(stripSkeleton) ?? [],
});
