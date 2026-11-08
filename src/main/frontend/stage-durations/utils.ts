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

// How much a stage's duration has to change by to matter. Short stages move by a few seconds
// for no reason, so nothing under 5s counts. Beyond that it grows with the square root of how
// long the stage takes, 10s for a 30s stage and 20s for 2 minutes, so a long stage needs more
// than a short one but less as a share of it. From about 10 minutes, where that reaches 45s, it
// grows in step with the stage instead, so an hour long stage needs to move by 4.5 minutes.
const MIN_CHANGE_MILLIS = 5_000;
const CHANGE_AT_30S_MILLIS = 10_000;
const CHANGE_SHARE_OF_LONG_STAGES = 0.075;

export function minimumChange(usualMillis: number): number {
  return Math.max(
    MIN_CHANGE_MILLIS,
    CHANGE_AT_30S_MILLIS * Math.sqrt(usualMillis / 30_000),
    CHANGE_SHARE_OF_LONG_STAGES * usualMillis,
  );
}

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
  return Math.max(minimumChange(usual.median), NOISE_FACTOR * usual.spread);
}

export function isSlower(duration: number, usual: Usual): boolean {
  return duration - usual.median >= threshold(usual);
}

export function isFaster(duration: number, usual: Usual): boolean {
  return usual.median - duration >= threshold(usual);
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
 * them, which build that started in. The builds are split into stretches that each took about the
 * same time, every stretch measured against the one before it, so a stage that changed more than
 * once, or went back to how long it used to take, reports the change that explains how long it
 * takes now. Measuring against the builds before rather than every build means a change that has
 * stuck for a while is still found, where it would otherwise have dragged the median up with it.
 * The first and last builds of a stretch must both take its new time, and a few in between may
 * not, so an occasional quick build doesn't hide a change that has otherwise stuck. Nothing is
 * reported while the latest builds haven't settled into a stretch of their own.
 *
 * @param durations each build's usual duration for the stage, oldest first
 */
export function findStep(
  durations: Array<number | undefined>,
): Step | undefined {
  const samples = durations.flatMap((duration, index) =>
    duration === undefined ? [] : [{ duration, index }],
  );

  let latest: Stretch | undefined;
  for (
    let found = nextStretch(samples, 0);
    found;
    found = nextStretch(samples, found.split)
  ) {
    latest = found;
  }
  return latest?.end === samples.length ? latest.step : undefined;
}

interface Sample {
  duration: number;
  index: number;
}

interface Stretch {
  step: Step;
  /** Where the stretch starts and ends among the samples. */
  split: number;
  end: number;
}

/** The first stretch after the samples from the given one that took noticeably different. */
function nextStretch(samples: Sample[], from: number): Stretch | undefined {
  for (
    let split = from + MIN_SAMPLES;
    split <= samples.length - SUSTAINED_BUILDS;
    split++
  ) {
    const before = usual(samples.slice(from, split).map((s) => s.duration))!;

    for (const direction of ["slower", "faster"] as const) {
      const differs = (s: Sample) =>
        direction === "slower"
          ? isSlower(s.duration, before)
          : isFaster(s.duration, before);
      // When the build just before already took the new time, the change started earlier
      if (differs(samples[split - 1]) || !differs(samples[split])) {
        continue;
      }
      for (let end = samples.length; end >= split + SUSTAINED_BUILDS; end--) {
        const since = samples.slice(split, end);
        const allowedMisses = Math.max(
          since.length > SUSTAINED_BUILDS ? 1 : 0,
          Math.floor(since.length * ALLOWED_MISSES),
        );
        if (
          differs(since[since.length - 1]) &&
          since.filter((s) => !differs(s)).length <= allowedMisses
        ) {
          return {
            split,
            end,
            step: {
              direction,
              start: since[0].index,
              usual: before,
              before: before.median,
              after: median(since.map((s) => s.duration))!,
              builds: since.length,
            },
          };
        }
      }
    }
  }
  return undefined;
}
