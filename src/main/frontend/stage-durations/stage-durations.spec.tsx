/** * @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RunInfo } from "../multi-pipeline-graph-view/multi-pipeline-graph/main/MultiPipelineGraphModel.ts";
import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { StageDurationsTable } from "./stage-durations.tsx";

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
  totalDurationMillis: number,
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
  totalDurationMillis,
  agent: "built-in",
  url: "",
  ...overrides,
});

const renderTable = (stagesByRun: Record<string, StageInfo[]>) => {
  const runs = Object.keys(stagesByRun)
    .map(Number)
    .sort((a, b) => b - a)
    .map((id) => run(id));
  render(
    <StageDurationsTable
      runs={runs}
      stagesByRun={stagesByRun}
      jobPath="/jenkins/job/example/"
    />,
  );
};

const rowOf = (build: string) => screen.getByText(build).closest("tr")!;

describe("StageDurationsTable", () => {
  const builds = {
    4: [stage("Checkout", 3_000), stage("Build", 12_000)],
    5: [stage("Checkout", 3_000), stage("Build", 13_000)],
    6: [stage("Checkout", 3_000), stage("Build", 14_000)],
    7: [stage("Checkout", 3_000), stage("Build", 21_000)],
  };

  it("lists each build's stage durations under the stage's name", () => {
    renderTable(builds);

    const headings = within(document.querySelector("thead")!)
      .getAllByRole("columnheader")
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["Build", "Checkout", "Build", "Total"]);
    expect(within(rowOf("#5")).getByText("13s")).toBeInTheDocument();
    expect(
      within(rowOf("#5")).getByText("13s").closest("a")!.getAttribute("href"),
    ).toMatch(/^\/jenkins\/job\/example\/5\/stages\?selected-node=\d+$/);
  });

  it("marks a stage that took noticeably longer than in the other builds", () => {
    renderTable(builds);

    expect(
      within(rowOf("#7")).getByRole("img", {
        name: "62% slower than usual (13s)",
      }),
    ).toBeInTheDocument();
    expect(within(rowOf("#6")).queryByRole("img", { name: /slower/ })).toBe(
      null,
    );
  });

  it("shows the median of each stage", () => {
    renderTable(builds);

    const footer = screen.getByText("Median").closest("tr")!;
    expect(
      within(footer)
        .getAllByRole("cell")
        .slice(1)
        .map((cell) => cell.textContent),
    ).toEqual(["3s", "13s", ""]);
  });

  it("shows when a build didn't run a stage", () => {
    renderTable({
      ...builds,
      8: [stage("Checkout", 3_000)],
    });

    expect(
      within(rowOf("#8")).getByTitle("Not run in this build"),
    ).toHaveTextContent("–");
  });

  it("doesn't count a failed stage as a usual duration", () => {
    renderTable({
      1: [stage("Build", 10_000)],
      2: [stage("Build", 20_000)],
      3: [stage("Build", 30_000)],
      4: [stage("Build", 1_000, { state: Result.failure })],
      5: [stage("Build", 1_000, { state: Result.failure })],
    });

    const footer = screen.getByText("Median").closest("tr")!;
    expect(within(footer).getAllByRole("cell")[1]).toHaveTextContent("20s");
  });
});
