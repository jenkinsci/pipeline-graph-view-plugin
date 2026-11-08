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
  minimumChange,
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

describe("minimumChange", () => {
  it("is 5s on a short stage", () => {
    expect(minimumChange(1_000)).toBe(5_000);
    expect(minimumChange(5_000)).toBe(5_000);
  });

  it("grows more slowly than the stage", () => {
    expect(minimumChange(30_000)).toBe(10_000);
    expect(minimumChange(120_000)).toBe(20_000);
    expect(Math.round(minimumChange(600_000) / 1000)).toBe(45);
  });

  it("grows in step with stages longer than about 10 minutes", () => {
    expect(minimumChange(20 * 60_000)).toBe(90_000);
    expect(minimumChange(60 * 60_000)).toBe(270_000);
  });
});

describe("isSlower", () => {
  it("flags a stage that takes noticeably longer than usual", () => {
    expect(isSlower(12_000, steady(4_000))).toBe(true);
    expect(isSlower(45_000, steady(30_000))).toBe(true);
  });

  it("ignores a few seconds on a short stage, whatever its share", () => {
    expect(isSlower(6_500, steady(4_000))).toBe(false);
    expect(isSlower(4_000, steady(1_000))).toBe(false);
  });

  it("ignores less than 10s on a 30s stage", () => {
    expect(isSlower(38_000, steady(30_000))).toBe(false);
  });

  it("flags minutes on a long stage, however small a share", () => {
    expect(isSlower(24 * 60_000, steady(20 * 60_000))).toBe(true);
    expect(isSlower(21 * 60_000, steady(20 * 60_000))).toBe(false);
  });

  it("ignores a couple of minutes on an hour long stage", () => {
    expect(isSlower(62 * 60_000, steady(60 * 60_000))).toBe(false);
    expect(isSlower(65 * 60_000, steady(60 * 60_000))).toBe(true);
  });

  it("ignores a stage varying as much as it usually does", () => {
    expect(isSlower(40_000, { median: 30_000, spread: 4_000 })).toBe(false);
    expect(isSlower(43_000, { median: 30_000, spread: 4_000 })).toBe(true);
  });
});

describe("isFaster", () => {
  it("flags a stage that takes noticeably less time than usual", () => {
    expect(isFaster(18_000, steady(30_000))).toBe(true);
  });

  it("ignores a small saving", () => {
    expect(isFaster(1_900, steady(5_100))).toBe(false);
    expect(isFaster(25_000, steady(30_000))).toBe(false);
  });
});

describe("findStep", () => {
  const s = (...seconds: Array<number | undefined>) =>
    seconds.map((value) => (value === undefined ? undefined : value * 1000));

  it("finds the build a stage started taking longer in", () => {
    expect(findStep(s(20, 20, 20, 20, 20, 20, 35, 35, 35, 35))).toEqual({
      direction: "slower",
      start: 6,
      usual: steady(20_000),
      before: 20_000,
      after: 35_000,
      builds: 4,
    });
  });

  it("still finds a change once most builds have taken the new time", () => {
    expect(findStep(s(20, 20, 20, 20, 32, 32, 32, 32, 32, 32))).toMatchObject({
      direction: "slower",
      start: 4,
      builds: 6,
    });
  });

  it("finds a stage that got faster", () => {
    expect(findStep(s(30, 30, 30, 30, 15, 15, 15))).toMatchObject({
      direction: "faster",
      start: 4,
      before: 30_000,
      after: 15_000,
    });
  });

  it("ignores a stage that moved by a few seconds", () => {
    expect(findStep(s(5, 5, 5, 5, 2, 2, 2, 2))).toBeUndefined();
    expect(findStep(s(4, 4, 4, 4, 6.5, 6.5, 6.5, 6.5))).toBeUndefined();
  });

  it("ignores a one-off slow build", () => {
    expect(findStep(s(20, 20, 20, 40, 20, 20))).toBeUndefined();
  });

  it("waits for a change to last before pointing it out", () => {
    expect(findStep(s(20, 20, 20, 20, 35, 35))).toBeUndefined();
    expect(findStep(s(20, 20, 20, 20, 35, 35, 35))).toMatchObject({
      start: 4,
    });
  });

  it("keeps the start of a change when one build since was quicker", () => {
    expect(findStep(s(20, 20, 20, 20, 35, 22, 35, 35))).toMatchObject({
      start: 4,
      builds: 4,
    });
  });

  it("finds the latest change when a stage changed twice", () => {
    expect(
      findStep(s(20, 20, 20, 20, 35, 35, 35, 35, 35, 60, 60, 60)),
    ).toMatchObject({ direction: "slower", start: 9, after: 60_000 });
  });

  it("finds a stage going back to how long it used to take", () => {
    expect(
      findStep(s(20, 20, 20, 20, 40, 40, 40, 40, 20, 20, 20)),
    ).toMatchObject({
      direction: "faster",
      start: 8,
      before: 40_000,
      after: 20_000,
    });
  });

  it("says nothing while the latest builds haven't settled", () => {
    expect(findStep(s(20, 20, 20, 20, 40, 40, 40, 40, 20, 20))).toBeUndefined();
  });

  it("keeps the start of a change through a few quick builds since", () => {
    expect(
      findStep(s(20, 20, 20, 20, 40, 40, 20, 40, 40, 40, 20, 40, 40, 40)),
    ).toMatchObject({ start: 4, builds: 10 });
  });

  it("finds a long stage that gained a few minutes", () => {
    const m = (...minutes: number[]) => minutes.map((value) => value * 60_000);
    expect(findStep(m(20, 20, 20, 20, 24, 24, 24))).toMatchObject({
      direction: "slower",
      start: 4,
    });
  });

  it("ignores a stage that varies as much as it always has", () => {
    expect(
      findStep(s(20, 28, 14, 24, 18, 26, 16, 28, 26, 28, 26)),
    ).toBeUndefined();
  });

  it("finds a change in a stage that varies", () => {
    expect(findStep(s(20, 24, 16, 22, 18, 45, 48, 43, 46))).toMatchObject({
      direction: "slower",
      start: 5,
    });
  });

  it("skips builds without a usual duration, keeping their position", () => {
    expect(
      findStep(s(20, 20, undefined, 20, 35, undefined, 35, 35)),
    ).toMatchObject({
      start: 4,
      builds: 3,
    });
  });

  it("needs enough builds before the change to know what was usual", () => {
    expect(findStep(s(20, 20, 35, 35, 35))).toBeUndefined();
  });

  it("finds nothing when the stage takes about as long as it always has", () => {
    expect(findStep(s(20, 22, 20, 22, 20, 22))).toBeUndefined();
  });
});
