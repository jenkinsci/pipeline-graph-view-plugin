import { StageInfo } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

export const mergeStageInfos = (
  skeletons: StageInfo[],
  incoming: StageInfo[],
): StageInfo[] => {
  const marked = markSkeleton(skeletons);
  const lookup = new Map(marked.map((stage) => [stage.name, stage]));
  const merged = incoming.map((incomingItem) => {
    const match = lookup.get(incomingItem.name);
    return {
      ...(match ?? {}),
      ...incomingItem,
      totalDurationMillis: incomingItem.totalDurationMillis,
      previousTotalDurationMillis: match?.totalDurationMillis,
      skeleton: false,
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
    startTimeMillis: 0, // Do not display start of steps in previous run.
    children: markSkeleton(s.children ?? []),
  }));
