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

// A minute or more stands out whatever share of the stage it is, so a long stage that gains
// minutes is still noticed
const SLOWER_BY_MILLIS_ON_ANY_STAGE = 60_000;

// How many times its usual spread a stage has to move by, so a stage whose duration varies a lot
// from build to build isn't flagged for varying as it always has
const NOISE_FACTOR = 3;

/** The median of the durations, once there are enough of them to say what's usual. */
export function baseline(
  durations: Array<number | undefined>,
): number | undefined {
  return usual(durations)?.median;
}

/** How long a stage usually takes and how much that varies between builds. */
export interface Usual {
  median: number;
  /** The median distance from the median. */
  spread: number;
}

/** What's usual for the durations, once there are enough of them to say. */
export function usual(durations: Array<number | undefined>): Usual | undefined {
  const samples = durations.filter(
    (duration): duration is number => duration !== undefined,
  );
  if (samples.length < MIN_SAMPLES) {
    return undefined;
  }
  const middle = median(samples)!;
  return {
    median: middle,
    spread: median(samples.map((sample) => Math.abs(sample - middle)))!,
  };
}

/**
 * What was usual for the stage before the given build. Only earlier builds count, so the builds
 * from before a stage got slower aren't made to look faster by the slower builds after them.
 */
export function usualBefore(
  durations: Array<number | undefined>,
  index: number,
): Usual | undefined {
  return usual(durations.slice(0, index));
}

function threshold(usual: Usual): number {
  return Math.max(SLOWER_BY_MILLIS, NOISE_FACTOR * usual.spread);
}

export function isSlower(duration: number, usual: Usual): boolean {
  const by = duration - usual.median;
  return (
    by >= threshold(usual) &&
    (duration >= usual.median * SLOWER_RATIO ||
      by >= SLOWER_BY_MILLIS_ON_ANY_STAGE)
  );
}

export function isFaster(duration: number, usual: Usual): boolean {
  const by = usual.median - duration;
  return (
    by >= threshold(usual) &&
    (duration * SLOWER_RATIO <= usual.median ||
      by >= SLOWER_BY_MILLIS_ON_ANY_STAGE)
  );
}

// A change has to last this many builds before it's pointed out, so a one-off isn't mistaken for it
export const SUSTAINED_BUILDS = 3;

// The share of builds since a change that may miss the new time, such as a build with a warm cache
const ALLOWED_MISSES = 0.2;

export interface Step {
  direction: "slower" | "faster";
  /** Index of the first build that took the new time. */
  start: number;
  /** What was usual before the change. */
  usual: Usual;
  /** Median duration before the change. */
  before: number;
  /** Median duration since the change. */
  after: number;
  /** How many builds have run the stage since the change. */
  builds: number;
}

/**
 * When the stage's latest builds have taken noticeably longer, or shorter, than the builds before
 * them, which build that started in. When it changed more than once, the latest change is the one
 * that explains how long it takes now. Comparing with the builds before the change rather than
 * every build means a change that has stuck for a while is still found, where a stage that's been
 * slower for most builds would have dragged their median up with it. The first and latest builds
 * since must both take the new time, and a few in between may not, so an occasional quick build
 * doesn't hide a change that has otherwise stuck.
 *
 * @param durations each build's usual duration for the stage, oldest first
 */
export function findStep(
  durations: Array<number | undefined>,
): Step | undefined {
  const samples = durations.flatMap((duration, index) =>
    duration === undefined ? [] : [{ duration, index }],
  );

  // After each change, look for another among the builds since, measured against them
  let latest: Step | undefined;
  let from = 0;
  for (;;) {
    const step = firstStep(samples.slice(from));
    if (!step) {
      return latest;
    }
    latest = step;
    from = samples.findIndex((sample) => sample.index === step.start);
  }
}

interface Sample {
  duration: number;
  index: number;
}

function firstStep(samples: Sample[]): Step | undefined {
  for (
    let split = MIN_SAMPLES;
    split <= samples.length - SUSTAINED_BUILDS;
    split++
  ) {
    const before = usual(samples.slice(0, split).map((s) => s.duration))!;
    const since = samples.slice(split);
    const allowedMisses = Math.max(
      since.length > SUSTAINED_BUILDS ? 1 : 0,
      Math.floor(since.length * ALLOWED_MISSES),
    );

    for (const direction of ["slower", "faster"] as const) {
      const differs = (s: Sample) =>
        direction === "slower"
          ? isSlower(s.duration, before)
          : isFaster(s.duration, before);
      // When the build just before already took the new time, the change started earlier
      if (
        !differs(samples[split - 1]) &&
        differs(since[0]) &&
        differs(since[since.length - 1]) &&
        since.filter((s) => !differs(s)).length <= allowedMisses
      ) {
        return {
          direction,
          start: since[0].index,
          usual: before,
          before: before.median,
          after: median(since.map((s) => s.duration))!,
          builds: since.length,
        };
      }
    }
  }
  return undefined;
}
