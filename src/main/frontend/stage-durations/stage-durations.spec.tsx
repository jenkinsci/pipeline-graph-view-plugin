/** * @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RunInfo } from "../multi-pipeline-graph-view/multi-pipeline-graph/main/MultiPipelineGraphModel.ts";
import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { StageDurationsView } from "./stage-durations.tsx";

const run = (id: number, result = Result.success): RunInfo => ({
  id: String(id),
  displayName: `#${id}`,
  timestamp: 0,
  duration: 60_000,
  changesCount: 0,
  result,
});

let nextId = 1;
const stage = (
  name: string,
  seconds: number,
  overrides: Partial<StageInfo> = {},
): StageInfo => ({
  name,
  title: name,
  state: Result.success,
  id: nextId++,
  type: "STAGE",
  children: [],
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: seconds * 1000,
  agent: "built-in",
  url: "",
  ...overrides,
});

const renderView = (
  stagesByRun: Record<string, StageInfo[]>,
  runs = Object.keys(stagesByRun)
    .map(Number)
    .sort((a, b) => b - a)
    .map((id) => run(id)),
) => {
  const { container } = render(
    <StageDurationsView
      runs={runs}
      stagesByRun={stagesByRun}
      jobPath="/jenkins/job/example/"
    />,
  );
  return container;
};

const rowOf = (stageName: string) =>
  screen.getByRole("rowheader", { name: stageName }).closest("tr")!;

const cellsOf = (stageName: string) =>
  within(rowOf(stageName)).getAllByRole("cell");

// Build is steady at 4s, then takes 9s from #8
const steadyThenSlower = Object.fromEntries(
  [4, 5, 6, 7, 8, 9, 10].map((id) => [
    id,
    [stage("Checkout", 1), stage("Build", id >= 8 ? 9 : 4)],
  ]),
);

describe("StageDurationsView", () => {
  it("lists a row per stage with the builds oldest to newest", () => {
    renderView(steadyThenSlower);

    const headings = within(document.querySelector("thead")!)
      .getAllByRole("columnheader")
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Stage",
      "#4",
      "#5",
      "#6",
      "#7",
      "#8",
      "#9",
      "#10",
      "Median",
      "Trend",
    ]);
    expect(
      screen.getAllByRole("rowheader").map((heading) => heading.textContent),
    ).toEqual(["Checkout", "Build", "Total"]);
    expect(cellsOf("Build")[0]).toHaveTextContent("4s");
    expect(within(cellsOf("Build")[4]).getByRole("link")).toHaveAttribute(
      "href",
      expect.stringMatching(
        /^\/jenkins\/job\/example\/8\/stages\?selected-node=\d+$/,
      ),
    );
  });

  it("points out a stage that got slower and the build it started in", () => {
    renderView(steadyThenSlower);

    const finding = screen.getByRole("heading", {
      name: "1 stage got slower",
    }).parentElement!;
    expect(finding).toHaveTextContent("Build");
    expect(finding).toHaveTextContent("4s → 9s");
    expect(finding).toHaveTextContent("+125%");
    expect(
      within(finding).getByRole("link", { name: "since #8" }),
    ).toHaveAttribute("href", "/jenkins/job/example/8/");
  });

  it("shades the builds since a stage got slower against how long it took before", () => {
    renderView(steadyThenSlower);

    const cells = cellsOf("Build");
    expect(cells[3].querySelector(".pgv-stage-durations__stage--slower")).toBe(
      null,
    );
    for (const index of [4, 5, 6]) {
      expect(
        cells[index].querySelector(".pgv-stage-durations__stage--much-slower"),
      ).not.toBe(null);
    }
  });

  it("shades a one-off slow build against the builds before it", () => {
    const container = renderView({
      1: [stage("Build", 4)],
      2: [stage("Build", 4)],
      3: [stage("Build", 4)],
      4: [stage("Build", 7)],
      5: [stage("Build", 4)],
    });

    expect(
      container.querySelectorAll(".pgv-stage-durations__stage--slower"),
    ).toHaveLength(1);
    expect(
      cellsOf("Build")[3].querySelector(".pgv-stage-durations__stage--slower"),
    ).not.toBe(null);
    expect(
      screen.getByText(
        "No stage has got noticeably slower or faster in these builds",
      ),
    ).toBeInTheDocument();
  });

  it("only shows a stage's status when it didn't succeed", () => {
    renderView({
      ...steadyThenSlower,
      11: [stage("Checkout", 1), stage("Build", 1, { state: Result.failure })],
    });

    expect(cellsOf("Checkout")[7].querySelector("svg")).toBe(null);
    expect(cellsOf("Build")[7].querySelector("svg")).not.toBe(null);
  });

  it("leaves failed stages out of the median", () => {
    renderView({
      1: [stage("Build", 10)],
      2: [stage("Build", 20)],
      3: [stage("Build", 30)],
      4: [stage("Build", 1, { state: Result.failure })],
      5: [stage("Build", 1, { state: Result.failure })],
    });

    expect(cellsOf("Build")[5]).toHaveTextContent("20s");
  });

  it("shows when a build didn't run a stage", () => {
    renderView({
      ...steadyThenSlower,
      11: [stage("Checkout", 1)],
    });

    expect(
      within(cellsOf("Build")[7]).getByTitle("Not run in this build"),
    ).toHaveTextContent("–");
  });

  it("shows a placeholder while a build's stages load", () => {
    renderView(
      steadyThenSlower,
      [11, 10, 9, 8, 7, 6, 5, 4].map((id) => run(id)),
    );

    expect(
      cellsOf("Build")[7].querySelector(".pgv-stage-durations__loading"),
    ).not.toBe(null);
  });

  it("asks for more builds before pointing out slower stages", () => {
    renderView({
      1: [stage("Build", 4)],
      2: [stage("Build", 9)],
    });

    expect(
      screen.getByText(
        "Slower stages are pointed out once there are at least 4 builds to compare",
      ),
    ).toBeInTheDocument();
  });
});

describe("StageDurationsView before a stage got slower", () => {
  it("doesn't make the earlier builds look faster", () => {
    const container = renderView(steadyThenSlower);

    expect(
      container.querySelectorAll(".pgv-stage-durations__stage--faster"),
    ).toHaveLength(0);
  });
});
