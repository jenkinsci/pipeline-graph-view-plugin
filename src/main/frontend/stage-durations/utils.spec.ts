import { describe, expect, it } from "vitest";

import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import {
  baseline,
  findStep,
  isFaster,
  isSlower,
  median,
  stageNames,
  usual,
  usualBefore,
  usualDuration,
} from "./utils.ts";

const stage = (
  name: string,
  overrides: Partial<StageInfo> = {},
): StageInfo => ({
  name,
  title: name,
  state: Result.success,
  id: 1,
  type: "STAGE",
  children: [],
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 1000,
  agent: "built-in",
  url: "",
  ...overrides,
});

const steady = (median: number) => ({ median, spread: 0 });

const named = (...names: string[]) => names.map((name) => stage(name));

describe("stageNames", () => {
  it("keeps the order the stages run in", () => {
    expect(
      stageNames([
        named("Checkout", "Build", "Test"),
        named("Checkout", "Build", "Test"),
      ]),
    ).toEqual(["Checkout", "Build", "Test"]);
  });

  it("places a stage that only older builds ran after the stage it followed", () => {
    expect(
      stageNames([
        named("Checkout", "Test"),
        named("Checkout", "Lint", "Test"),
      ]),
    ).toEqual(["Checkout", "Lint", "Test"]);
  });

  it("places a stage that only the newest build ran where it runs", () => {
    expect(
      stageNames([
        named("Checkout", "Scan", "Test"),
        named("Checkout", "Test"),
      ]),
    ).toEqual(["Checkout", "Scan", "Test"]);
  });

  it("places a stage an older build ran first at the start", () => {
    expect(stageNames([named("Build"), named("Setup", "Build")])).toEqual([
      "Setup",
      "Build",
    ]);
  });
});

describe("median", () => {
  it("is the middle value", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("is the mean of the middle two for an even count", () => {
    expect(median([4, 1, 2, 6])).toBe(3);
  });

  it("is whole milliseconds, so it can be formatted", () => {
    expect(median([534, 535])).toBe(535);
  });

  it("is undefined without values", () => {
    expect(median([])).toBeUndefined();
  });
});

describe("usualDuration", () => {
  it("counts successful and unstable stages", () => {
    expect(usualDuration(stage("Build", { totalDurationMillis: 5000 }))).toBe(
      5000,
    );
    expect(
      usualDuration(
        stage("Build", { state: Result.unstable, totalDurationMillis: 5000 }),
      ),
    ).toBe(5000);
  });

  it("leaves out stages that stopped early, are still going or haven't run", () => {
    expect(
      usualDuration(stage("Build", { state: Result.failure })),
    ).toBeUndefined();
    expect(
      usualDuration(stage("Build", { state: Result.aborted })),
    ).toBeUndefined();
    expect(
      usualDuration(
        stage("Build", {
          state: Result.running,
          totalDurationMillis: undefined,
        }),
      ),
    ).toBeUndefined();
    expect(usualDuration(stage("Build", { skeleton: true }))).toBeUndefined();
    expect(usualDuration(undefined)).toBeUndefined();
  });
});

describe("baseline", () => {
  it("is the median", () => {
    expect(baseline([10_000, 12_000, 14_000])).toBe(12_000);
  });

  it("needs enough builds to say what's usual", () => {
    expect(baseline([10_000, 12_000])).toBeUndefined();
  });

  it("skips builds without a usual duration", () => {
    expect(baseline([10_000, undefined, 12_000, 14_000])).toBe(12_000);
  });
});

describe("usual", () => {
  it("is the median and how far builds usually are from it", () => {
    expect(usual([10_000, 12_000, 15_000, 11_000, 30_000])).toEqual({
      median: 12_000,
      spread: 2_000,
    });
  });

  it("needs enough builds to say what's usual", () => {
    expect(usual([10_000, undefined, 12_000])).toBeUndefined();
  });
});

describe("usualBefore", () => {
  it("only counts the builds before", () => {
    expect(usualBefore([3_000, 3_000, 3_000, 5_000, 5_000, 5_000], 4)).toEqual(
      steady(3_000),
    );
  });

  it("has nothing to compare the first builds with", () => {
    expect(usualBefore([3_000, 3_000, 3_000, 5_000], 2)).toBeUndefined();
  });
});

describe("isSlower", () => {
  it("flags a stage that takes noticeably longer than usual", () => {
    expect(isSlower(18_000, steady(14_000))).toBe(true);
  });

  it("ignores a few seconds on a long stage", () => {
    expect(isSlower(110_000, steady(100_000))).toBe(false);
  });

  it("ignores a stage varying as much as it usually does", () => {
    expect(isSlower(14_000, { median: 10_000, spread: 2_000 })).toBe(false);
    expect(isSlower(17_000, { median: 10_000, spread: 2_000 })).toBe(true);
  });

  it("ignores a large share of a short stage", () => {
    expect(isSlower(2_000, steady(1_000))).toBe(false);
  });
});

describe("isFaster", () => {
  it("flags a stage that takes noticeably less time than usual", () => {
    expect(isFaster(10_000, steady(14_000))).toBe(true);
  });

  it("ignores a small saving", () => {
    expect(isFaster(13_000, steady(14_000))).toBe(false);
  });
});

describe("findStep", () => {
  const s = (...seconds: Array<number | undefined>) =>
    seconds.map((value) => (value === undefined ? undefined : value * 1000));

  it("finds the build a stage started taking longer in", () => {
    expect(findStep(s(3, 3, 3, 3, 3, 3, 6, 6, 6, 6))).toEqual({
      direction: "slower",
      start: 6,
      usual: steady(3000),
      before: 3000,
      after: 6000,
      builds: 4,
    });
  });

  it("still finds a change once most builds have taken the new time", () => {
    expect(findStep(s(3, 3, 3, 3, 5, 5, 5, 5, 5, 5))).toMatchObject({
      direction: "slower",
      start: 4,
      builds: 6,
    });
  });

  it("finds a stage that got faster", () => {
    expect(findStep(s(10, 10, 10, 10, 4, 4, 4))).toMatchObject({
      direction: "faster",
      start: 4,
      before: 10_000,
      after: 4000,
    });
  });

  it("ignores a one-off slow build", () => {
    expect(findStep(s(3, 3, 3, 9, 3, 3))).toBeUndefined();
  });

  it("waits for a change to last before pointing it out", () => {
    expect(findStep(s(3, 3, 3, 3, 6, 6))).toBeUndefined();
    expect(findStep(s(3, 3, 3, 3, 6, 6, 6))).toMatchObject({ start: 4 });
  });

  it("keeps the start of a change when one build since was quicker", () => {
    expect(findStep(s(4, 4, 4, 4, 6, 5, 6, 6))).toMatchObject({
      start: 4,
      builds: 4,
    });
  });

  it("ignores a stage that varies as much as it always has", () => {
    expect(
      findStep(s(10, 14, 7, 12, 9, 13, 8, 14, 13, 14, 13)),
    ).toBeUndefined();
  });

  it("finds a change in a stage that varies", () => {
    expect(findStep(s(10, 12, 8, 11, 9, 20, 22, 19, 21))).toMatchObject({
      direction: "slower",
      start: 5,
    });
  });

  it("skips builds without a usual duration, keeping their position", () => {
    expect(findStep(s(3, 3, undefined, 3, 6, undefined, 6, 6))).toMatchObject({
      start: 4,
      builds: 3,
    });
  });

  it("needs enough builds before the change to know what was usual", () => {
    expect(findStep(s(3, 3, 6, 6, 6))).toBeUndefined();
  });

  it("finds nothing when the stage takes about as long as it always has", () => {
    expect(findStep(s(3, 4, 3, 4, 3, 4))).toBeUndefined();
  });
});
