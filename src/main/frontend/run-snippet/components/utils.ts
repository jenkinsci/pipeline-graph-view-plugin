import { StageInfo } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

type VisibleRunItem =
  | {
      kind: "stage";
      stage: StageInfo;
    }
  | {
      kind: "collapsed";
      id: string;
      hiddenCount: number;
      stages: StageInfo[];
    };

const FAILURE_STATES = new Set(["FAILED", "FAILURE", "ERROR", "ABORTED"]);

const WARNING_STATES = new Set(["UNSTABLE", "WARNING", "WARN"]);

const IN_PROGRESS_STATES = new Set(["RUNNING", "PAUSED", "QUEUED"]);

function isFailureState(state: string): boolean {
  return FAILURE_STATES.has(state.toUpperCase());
}

function isWarningState(state: string): boolean {
  return WARNING_STATES.has(state.toUpperCase());
}

function getSpecialStageIndex(stages: StageInfo[]): number {
  const firstFailure = stages.findIndex((stage) => isFailureState(stage.state));
  if (firstFailure !== -1) {
    return firstFailure;
  }

  const firstWarning = stages.findIndex((stage) => isWarningState(stage.state));
  if (firstWarning !== -1) {
    return firstWarning;
  }

  return stages.findIndex(
    (stage) =>
      !stage.skeleton && IN_PROGRESS_STATES.has(stage.state.toUpperCase()),
  );
}

/**
 * Splits the stages into the items they render as: the kept stages, plus a
 * collapsed marker for each run of hidden stages around them.
 */
function toItems(stages: StageInfo[], keep: Set<number>): VisibleRunItem[] {
  const items: VisibleRunItem[] = [];
  let hiddenFrom = 0;

  const collapse = (to: number) => {
    if (to > hiddenFrom) {
      items.push({
        kind: "collapsed",
        id: `collapsed-${hiddenFrom}-${to - 1}`,
        hiddenCount: to - hiddenFrom,
        stages: stages.slice(hiddenFrom, to),
      });
    }
  };

  for (const index of uniqueSortedIndices([...keep], stages.length)) {
    collapse(index);
    items.push({ kind: "stage", stage: stages[index] });
    hiddenFrom = index + 1;
  }
  collapse(stages.length);

  return items;
}

function uniqueSortedIndices(indices: number[], max: number): number[] {
  return [...new Set(indices)]
    .filter((i) => i >= 0 && i < max)
    .sort((a, b) => a - b);
}

/**
 * Picks which top-level stages to show in at most `maxVisibleStages` items, collapsing the rest
 * into markers. A failed, unstable or in-progress stage is always kept, so at least 3 items (the
 * stage plus a marker either side) are needed for the result to fit.
 */
export function collapseTopLevelStages(
  stages: StageInfo[],
  maxVisibleStages = 10,
): VisibleRunItem[] {
  if (stages.length <= maxVisibleStages) {
    return stages.map((stage) => ({
      kind: "stage",
      stage,
    }));
  }

  const specialIndex = getSpecialStageIndex(stages);

  // Leave room for one collapsed marker.
  const targetStageCount = Math.max(1, maxVisibleStages - 1);

  // Start with a balanced default window.
  const headCount = Math.ceil(targetStageCount / 2);
  const tailCount = Math.floor(targetStageCount / 2);

  const keep = new Set<number>();

  const addHead = (count: number) => {
    for (let i = 0; i < Math.min(count, stages.length); i += 1) {
      keep.add(i);
    }
  };

  const addTail = (count: number) => {
    for (
      let i = Math.max(0, stages.length - count);
      i < stages.length;
      i += 1
    ) {
      keep.add(i);
    }
  };

  addHead(headCount);
  addTail(tailCount);

  if (specialIndex !== -1) {
    keep.add(specialIndex);
  }

  // Each run of hidden stages takes a slot for its collapsed marker, so trim
  // kept stages until the stages and markers together fit, biased toward
  // keeping the special stage plus the earliest and latest context
  while (toItems(stages, keep).length > maxVisibleStages) {
    // Prefer removing non-special items closest to the middle.
    const removable = [...keep].filter((i) => i !== specialIndex);
    if (removable.length === 0) {
      break;
    }

    let candidate = removable[0];
    let bestScore = -Infinity;

    for (const index of removable) {
      const distanceFromEdge = Math.min(index, stages.length - 1 - index);
      const nextToSpecial =
        specialIndex !== -1 && Math.abs(index - specialIndex) < 2;

      // Higher score = more removable.
      const score = distanceFromEdge * 10 + (nextToSpecial ? -100 : 0);

      if (score > bestScore) {
        bestScore = score;
        candidate = index;
      }
    }

    keep.delete(candidate);
  }

  return toItems(stages, keep);
}
