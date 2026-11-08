import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

/**
 * The stage names to show as columns, in the order the builds run them. Stages are matched across
 * builds by name, so a stage added or removed part way through still lines up with itself. The
 * builds are given newest first, so the newest build decides where a stage sits.
 */
export function stageColumns(builds: StageInfo[][]): string[] {
  const columns: string[] = [];
  for (const stages of builds) {
    let previous = -1;
    for (const { name } of stages) {
      const index = columns.indexOf(name);
      if (index === -1) {
        columns.splice(previous + 1, 0, name);
        previous += 1;
      } else {
        previous = index;
      }
    }
  }
  return columns;
}

export function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * How long the stage took, when it's a fair sample of how long it usually takes. Failed or aborted
 * stages often stop early, so they would make the usual duration look shorter than it is.
 */
export function usualDuration(
  stage: StageInfo | undefined,
): number | undefined {
  if (
    !stage ||
    stage.skeleton ||
    stage.totalDurationMillis === undefined ||
    (stage.state !== Result.success && stage.state !== Result.unstable)
  ) {
    return undefined;
  }
  return stage.totalDurationMillis;
}

// Fewer builds than this aren't enough to say what's usual
export const MIN_SAMPLES = 3;

// A stage is slower when it takes both this much longer and this many times as long as usual, so
// neither a few seconds on a short stage nor a small share of a long one stands out
const SLOWER_BY_MILLIS = 2_000;
const SLOWER_RATIO = 1.25;

/**
 * The median duration of the stage in the other builds, which a build's own duration is compared
 * with so a slow build doesn't raise the bar it's measured against.
 */
export function baseline(
  durations: Array<number | undefined>,
  exclude?: number,
): number | undefined {
  const samples = durations.filter(
    (duration, index): duration is number =>
      duration !== undefined && index !== exclude,
  );
  return samples.length >= MIN_SAMPLES ? median(samples) : undefined;
}

export function isSlower(duration: number, usual: number): boolean {
  return (
    duration - usual >= SLOWER_BY_MILLIS && duration >= usual * SLOWER_RATIO
  );
}
