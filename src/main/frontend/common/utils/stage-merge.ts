import { StageInfo } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import RunEstimator from "./run-estimator.ts";

export const mergeStageInfos = (
  skeletons: StageInfo[],
  incoming: StageInfo[],
): StageInfo[] => {
  const marked = markSkeleton(skeletons);
  const estimator = new RunEstimator(marked);
  const merged = incoming.map((incomingItem) => {
    const match = marked.find((s) => s.name === incomingItem.name);
    return {
      ...(match ?? {}),
      ...incomingItem,
      skeleton: false,
      completePercent: estimator.estimateCompletion(incomingItem),
      children: mergeStageInfos(
        match?.children ?? [],
        incomingItem.children ?? [],
      ),
    };
  });

  if (merged.length === 0) {
    return marked;
  }

  const nameToIndex = new Map<string, number>();
  marked.forEach((s, idx) => nameToIndex.set(s.name, idx));

  const hasUnknown = incoming.some((item) => !nameToIndex.has(item.name));
  if (hasUnknown) {
    return merged;
  }

  const lastRanIndex = incoming.reduce((maxIdx, item) => {
    const idx = nameToIndex.get(item.name) ?? -1;
    return idx > maxIdx ? idx : maxIdx;
  }, -1);

  const futureSkeletons = marked.filter((s) => {
    const idx = nameToIndex.get(s.name) ?? Infinity;
    return idx > lastRanIndex && !incoming.some((i) => i.name === s.name);
  });

  return [...merged, ...futureSkeletons];
};

const markSkeleton = (stages: StageInfo[]): StageInfo[] =>
  stages.map((s) => ({
    ...s,
    skeleton: true,
    completePercent: 0,
    children: markSkeleton(s.children ?? []),
  }));
