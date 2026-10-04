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

function uniqueSortedIndices(indices: number[], max: number): number[] {
  return [...new Set(indices)]
    .filter((i) => i >= 0 && i < max)
    .sort((a, b) => a - b);
}

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

    // If adding the special stage pushed us over budget, bias toward keeping
    // the special stage plus the earliest and latest context.
    while (keep.size > targetStageCount) {
      const sorted = [...keep].sort((a, b) => a - b);

      // Prefer removing non-special items closest to the middle.
      const removable = sorted.filter((i) => i !== specialIndex);
      if (removable.length === 0) {
        break;
      }

      let candidate = removable[0];
      let bestScore = -1;

      for (const index of removable) {
        const distanceFromEdge = Math.min(index, stages.length - 1 - index);
        const distanceFromSpecial = Math.abs(index - specialIndex);

        // Higher score = more removable.
        const score =
          distanceFromEdge * 10 + (distanceFromSpecial < 2 ? -100 : 0);

        if (score > bestScore) {
          bestScore = score;
          candidate = index;
        }
      }

      keep.delete(candidate);
    }
  }

  const keptIndices = uniqueSortedIndices([...keep], stages.length);
  const result: VisibleRunItem[] = [];

  for (let i = 0; i < keptIndices.length; i += 1) {
    const currentIndex = keptIndices[i];
    const previousIndex = i > 0 ? keptIndices[i - 1] : -1;

    if (previousIndex !== -1 && currentIndex - previousIndex > 1) {
      result.push({
        kind: "collapsed",
        id: `collapsed-${previousIndex + 1}-${currentIndex - 1}`,
        hiddenCount: currentIndex - previousIndex - 1,
      });
    }

    result.push({
      kind: "stage",
      stage: stages[currentIndex],
    });
  }

  return result;
}
