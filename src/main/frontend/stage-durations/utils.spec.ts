import { describe, expect, it } from "vitest";

import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import {
  baseline,
  isSlower,
  median,
  stageColumns,
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

const named = (...names: string[]) => names.map((name) => stage(name));

describe("stageColumns", () => {
  it("keeps the order the stages run in", () => {
    expect(
      stageColumns([
        named("Checkout", "Build", "Test"),
        named("Checkout", "Build", "Test"),
      ]),
    ).toEqual(["Checkout", "Build", "Test"]);
  });

  it("places a stage that only older builds ran after the stage it followed", () => {
    expect(
      stageColumns([
        named("Checkout", "Test"),
        named("Checkout", "Lint", "Test"),
      ]),
    ).toEqual(["Checkout", "Lint", "Test"]);
  });

  it("places a stage that only the newest build ran where it runs", () => {
    expect(
      stageColumns([
        named("Checkout", "Scan", "Test"),
        named("Checkout", "Test"),
      ]),
    ).toEqual(["Checkout", "Scan", "Test"]);
  });

  it("places a stage an older build ran first at the start", () => {
    expect(stageColumns([named("Build"), named("Setup", "Build")])).toEqual([
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
    expect(median([4, 1, 2, 3])).toBe(2.5);
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
  it("is the median of the other builds", () => {
    expect(baseline([30_000, 10_000, 12_000, 14_000], 0)).toBe(12_000);
  });

  it("needs enough builds to compare with", () => {
    expect(baseline([30_000, 10_000, 12_000], 0)).toBeUndefined();
  });

  it("skips builds without a usual duration", () => {
    expect(baseline([10_000, undefined, 12_000, 14_000])).toBe(12_000);
  });
});

describe("isSlower", () => {
  it("flags a stage that takes noticeably longer than usual", () => {
    expect(isSlower(18_000, 14_000)).toBe(true);
  });

  it("ignores a few seconds on a long stage", () => {
    expect(isSlower(110_000, 100_000)).toBe(false);
  });

  it("ignores a large share of a short stage", () => {
    expect(isSlower(2_500, 1_000)).toBe(false);
  });
});
