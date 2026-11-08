import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

/**
 * The stage names to show, in the order the builds run them. Stages are matched across builds by
 * name, so a stage added or removed part way through still lines up with itself. The builds are
 * given newest first, so the newest build decides where a stage sits.
 */
export function stageNames(builds: StageInfo[][]): string[] {
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

// Durations are whole milliseconds, which is all Intl.DurationFormat accepts
export function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
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
const SLOWER_BY_MILLIS = 1_500;
const SLOWER_RATIO = 1.25;

/** The median of the durations, once there are enough of them to say what's usual. */
export function baseline(
  durations: Array<number | undefined>,
): number | undefined {
  const samples = durations.filter(
    (duration): duration is number => duration !== undefined,
  );
  return samples.length >= MIN_SAMPLES ? median(samples) : undefined;
}

/**
 * How long the stage usually took before the given build. Only earlier builds count, so the builds
 * from before a stage got slower aren't made to look faster by the slower builds after them.
 */
export function usualBefore(
  durations: Array<number | undefined>,
  index: number,
): number | undefined {
  return baseline(durations.slice(0, index));
}

export function isSlower(duration: number, usual: number): boolean {
  return (
    duration - usual >= SLOWER_BY_MILLIS && duration >= usual * SLOWER_RATIO
  );
}

export function isFaster(duration: number, usual: number): boolean {
  return (
    usual - duration >= SLOWER_BY_MILLIS && duration * SLOWER_RATIO <= usual
  );
}

// A change seen in at least this many builds in a row has stuck, rather than being a one-off
export const SUSTAINED_BUILDS = 3;

export interface Step {
  direction: "slower" | "faster";
  /** Index of the first build that took the new time. */
  start: number;
  /** Median duration before the change. */
  before: number;
  /** Median duration since the change. */
  after: number;
  /** How many builds have taken the new time. */
  builds: number;
}

/**
 * When the stage's latest builds have all taken noticeably longer, or shorter, than the builds
 * before them, which build that started in. Comparing with the builds before the change rather
 * than every build means a change that has stuck for a while is still found, where a stage that's
 * been slower for most builds would have dragged their median up with it. A one-off slow build is
 * followed by a usual one, so it's never the start of a change.
 *
 * @param durations each build's usual duration for the stage, oldest first
 */
export function findStep(
  durations: Array<number | undefined>,
): Step | undefined {
  const samples = durations.flatMap((duration, index) =>
    duration === undefined ? [] : [{ duration, index }],
  );

  for (let split = MIN_SAMPLES; split < samples.length; split++) {
    const before = median(samples.slice(0, split).map((s) => s.duration))!;
    const since = samples.slice(split);

    for (const direction of ["slower", "faster"] as const) {
      const differs = direction === "slower" ? isSlower : isFaster;
      // When the build just before already took the new time, the change started earlier than
      // there are enough builds before it to tell
      if (
        !differs(samples[split - 1].duration, before) &&
        since.every((s) => differs(s.duration, before))
      ) {
        return {
          direction,
          start: since[0].index,
          before,
          after: median(since.map((s) => s.duration))!,
          builds: since.length,
        };
      }
    }
  }
  return undefined;
}
