/** * @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
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
  within(durationsTable())
    .getByRole("rowheader", { name: new RegExp(`^${stageName}`) })
    .closest("tr")!;

function durationsTable() {
  return document.querySelector<HTMLElement>(
    ".pgv-stage-durations__scroller table",
  )!;
}

function changesCard() {
  return document.querySelector<HTMLElement>(".pgv-stage-durations__changes");
}

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

    const headings = within(durationsTable().querySelector("thead")!)
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
      within(durationsTable())
        .getAllByRole("rowheader")
        .map(
          (heading) =>
            heading.querySelector(".pgv-user-specified-text")?.textContent ??
            heading.textContent,
        ),
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

    const change = within(
      screen.getByRole("group", { name: "Stages that changed" }),
    ).getByRole("button");
    expect(change).toHaveTextContent("Build▲ +125%4s → 9ssince #8");
    expect(
      within(rowOf("Build")).getByRole("link", { name: "Slower since #8" }),
    ).toHaveAttribute("href", "/jenkins/job/example/8/");
  });

  it("narrows the table down to a changed stage when it's pressed", () => {
    renderView(steadyThenSlower);
    const change = within(
      screen.getByRole("group", { name: "Stages that changed" }),
    ).getByRole("button");

    fireEvent.click(change);
    expect(change).toHaveAttribute("aria-pressed", "true");
    expect(
      within(durationsTable())
        .getAllByRole("rowheader")
        .map(
          (heading) =>
            heading.querySelector(".pgv-user-specified-text")?.textContent ??
            heading.textContent,
        ),
    ).toEqual(["Build", "Total"]);

    fireEvent.click(change);
    expect(change).toHaveAttribute("aria-pressed", "false");
  });

  it("shades the builds since a stage got slower against how long it took before", () => {
    renderView(steadyThenSlower);

    const cells = cellsOf("Build");
    expect(cells[3]).not.toHaveClass("pgv-stage-durations__cell--slower");
    for (const index of [4, 5, 6]) {
      expect(cells[index]).toHaveClass(
        "pgv-stage-durations__cell--much-slower",
      );
    }
  });

  it("shades a one-off slow build against the builds before it", () => {
    const container = renderView({
      1: [stage("Build", 4)],
      2: [stage("Build", 4)],
      3: [stage("Build", 4)],
      4: [stage("Build", 7)],
      5: [stage("Build", 4)],
      6: [stage("Build", 4)],
    });

    expect(
      container.querySelectorAll(".pgv-stage-durations__cell--slower"),
    ).toHaveLength(1);
    expect(cellsOf("Build")[3]).toHaveClass(
      "pgv-stage-durations__cell--slower",
    );
    expect(
      screen.getByText("No stage got noticeably slower or faster"),
    ).toBeInTheDocument();
    expect(changesCard()).toBeNull();
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
        "Slower stages are pointed out once there are 6 builds to compare",
      ),
    ).toBeInTheDocument();
  });
});

describe("StageDurationsView before a stage got slower", () => {
  it("doesn't make the earlier builds look faster", () => {
    const container = renderView(steadyThenSlower);

    expect(
      container.querySelectorAll(".pgv-stage-durations__cell--faster"),
    ).toHaveLength(0);
  });
});

describe("StageDurationsView with many stages", () => {
  const names = [
    "Checkout",
    "Compile",
    "Unit tests",
    "Lint",
    "Package",
    "Integration tests",
    "Scan",
    "Publish",
    "Deploy to staging",
    "Smoke tests",
    "Deploy to production",
    "Notify",
    "Cleanup",
  ];
  const stagesByRun = Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7].map((id) => [
      id,
      names.map((name) =>
        stage(name, name === "Unit tests" && id >= 5 ? 9 : 4),
      ),
    ]),
  );
  const shownStages = () =>
    within(durationsTable())
      .getAllByRole("rowheader")
      .map(
        (heading) =>
          heading.querySelector(".pgv-user-specified-text")?.textContent ??
          heading.textContent,
      );
  const renderWith = (options: {
    builds?: number;
    filter?: string;
    changedOnly?: boolean;
  }) =>
    render(
      <StageDurationsView
        runs={[7, 6, 5, 4, 3, 2, 1].map((id) => run(id))}
        stagesByRun={stagesByRun}
        jobPath="/jenkins/job/example/"
        options={{ builds: 10, filter: "", changedOnly: false, ...options }}
      />,
    );

  it("offers a filter once there are more stages than fit", () => {
    renderWith({});

    expect(
      screen.getByRole("searchbox", { name: "Filter stages" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Changed only" }),
    ).toBeInTheDocument();
  });

  it("shows the stages whose name matches, keeping the total", () => {
    renderWith({ filter: "TESTS" });

    expect(shownStages()).toEqual([
      "Unit tests",
      "Integration tests",
      "Smoke tests",
      "Total",
    ]);
  });

  it("shows only the stages that changed", () => {
    renderWith({ changedOnly: true });

    expect(shownStages()).toEqual(["Unit tests", "Total"]);
  });

  it("says when no stage matches", () => {
    renderWith({ filter: "nothing like this" });

    expect(screen.getByText("No stages match")).toBeInTheDocument();
  });
});

describe("StageDurationsView with few stages", () => {
  it("doesn't offer a filter", () => {
    renderView(steadyThenSlower);

    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});

describe("StageDurationsView with earlier builds loaded", () => {
  it("still points out a change that started before the builds shown", () => {
    const stagesByRun = Object.fromEntries(
      Array.from({ length: 15 }, (_, index) => index + 1).map((id) => [
        id,
        [stage("Build", id >= 4 ? 9 : 4)],
      ]),
    );
    render(
      <StageDurationsView
        runs={Object.keys(stagesByRun)
          .map(Number)
          .sort((a, b) => b - a)
          .map((id) => run(id))}
        stagesByRun={stagesByRun}
        jobPath="/jenkins/job/example/"
        options={{ builds: 10, filter: "", changedOnly: false }}
      />,
    );

    expect(
      within(durationsTable().querySelector("thead")!)
        .getAllByRole("columnheader")
        .map((heading) => heading.textContent)[1],
    ).toBe("#6");
    expect(
      within(rowOf("Build")).getByRole("link", { name: "Slower since #4" }),
    ).toHaveAttribute("href", "/jenkins/job/example/4/");
  });
});

describe("StageDurationsView cells", () => {
  it("shows a skipped stage without a duration", () => {
    renderView({
      ...steadyThenSlower,
      11: [
        stage("Checkout", 1),
        stage("Build", 0.02, { state: Result.skipped }),
      ],
    });

    const cell = cellsOf("Build")[7];
    expect(cell).not.toHaveTextContent("20ms");
    expect(within(cell).getByRole("link")).toHaveAccessibleName(
      "Build, Skipped",
    );
  });

  it("describes a shaded cell in words, not just colour", () => {
    renderView(steadyThenSlower);

    expect(within(cellsOf("Build")[4]).getByRole("link")).toHaveAccessibleName(
      "Build, 9s, Twice as long or more",
    );
  });
});
