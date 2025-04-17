import { StageInfo } from "../../pipeline-graph-view/pipeline-graph/main";
import RunEstimator from "./run-estimator";

export const mergeStageInfos = (
  skeletons: StageInfo[],
  incoming: StageInfo[],
): StageInfo[] => {
  skeletons = markSkeleton(skeletons);
  const previous = new RunEstimator(skeletons);
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

const markSkeleton = (stages: StageInfo[]): StageInfo[] =>
  stages.map((s) => ({
    ...s,
    skeleton: true,
    completePercent: 0,
    children: markSkeleton(s.children ?? []),
  }));

const stripSkeleton = (stage: StageInfo): StageInfo => ({
  ...stage,
  skeleton: false,
  completePercent: 0,
  children: stage.children?.map(stripSkeleton) ?? [],
});
