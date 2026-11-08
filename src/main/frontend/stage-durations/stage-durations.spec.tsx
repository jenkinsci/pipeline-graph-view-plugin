/** * @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RunInfo } from "../multi-pipeline-graph-view/multi-pipeline-graph/main/MultiPipelineGraphModel.ts";
import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import {
  formatDuration,
  percentChange,
  StageDurationsView,
} from "./stage-durations.tsx";

const run = (id: number, result = Result.success): RunInfo => ({
  id: String(id),
  displayName: `#${id}`,
  timestamp: 0,
  duration: 60_000,
  changesCount: 0,
  result,
  building: false,
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

type ViewOptions = Parameters<typeof StageDurationsView>[0]["options"];

/** Keeps the options the view is given in step with the ones it asks for. */
function View({
  initial,
  ...props
}: Omit<Parameters<typeof StageDurationsView>[0], "options" | "onOptions"> & {
  initial?: Partial<NonNullable<ViewOptions>>;
}) {
  const [options, setOptions] = useState<NonNullable<ViewOptions>>({
    builds: 10,
    filter: "",
    changedOnly: false,
    ...initial,
  });
  return (
    <StageDurationsView
      {...props}
      options={options}
      onOptions={(changed) =>
        setOptions((previous) => ({ ...previous, ...changed }))
      }
    />
  );
}

const renderView = (
  stagesByRun: Record<string, StageInfo[]>,
  runs = Object.keys(stagesByRun)
    .map(Number)
    .sort((a, b) => b - a)
    .map((id) => run(id)),
) => {
  const { container } = render(
    <View
      runs={runs}
      stagesByRun={stagesByRun}
      jobPath="/jenkins/job/example/"
    />,
  );
  return container;
};

const nameOf = (heading: HTMLElement) =>
  heading.querySelector(".pgv-user-specified-text")?.textContent ??
  heading.textContent;

const rowOf = (stageName: string) =>
  within(durationsTable())
    .getAllByRole("rowheader")
    .find((heading) => nameOf(heading) === stageName)!
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
    ).toEqual(["Checkout", "Build", "Build total"]);
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
    expect(change).toHaveTextContent("Build▲ +125% slower4s → 9ssince #8");
    expect(
      within(rowOf("Build")).getByRole("link", { name: "Slower since #8" }),
    ).toHaveAttribute("href", "/jenkins/job/example/8/changes");
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
    ).toEqual(["Build", "Build total"]);

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
      4: [stage("Build", 12)],
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
    expect(changesCard()).toHaveTextContent(
      "No stage got noticeably slower or faster",
    );
    expect(changesCard()!.querySelector("button")).toBeNull();
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
      "Build total",
    ]);
  });

  it("shows only the stages that changed", () => {
    renderWith({ changedOnly: true });

    expect(shownStages()).toEqual(["Unit tests", "Build total"]);
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
    ).toHaveAttribute("href", "/jenkins/job/example/4/changes");
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
      "#11, Build, Skipped",
    );
  });

  it("describes a shaded cell in words, not just colour", () => {
    renderView(steadyThenSlower);

    expect(within(cellsOf("Build")[4]).getByRole("link")).toHaveAccessibleName(
      "#8, Build, 9s, Twice as long or more",
    );
  });
});

describe("StageDurationsView while builds load", () => {
  it("doesn't say nothing matched or nothing changed", () => {
    render(
      <View
        runs={[run(3), run(2), run(1)]}
        stagesByRun={{ 3: [stage("Build", 4)] }}
        jobPath="/jenkins/job/example/"
      />,
    );

    expect(screen.queryByText("No stages match")).toBeNull();
    expect(changesCard()).toBeNull();
  });
});

describe("StageDurationsView with a pressed change", () => {
  it("lets go of a stage that's no longer listed as changed", () => {
    render(
      <View
        runs={[7, 6, 5, 4].map((id) => run(id))}
        stagesByRun={Object.fromEntries(
          [4, 5, 6, 7].map((id) => [
            id,
            [stage("Checkout", 1), stage("Build", 4)],
          ]),
        )}
        jobPath="/jenkins/job/example/"
        initial={{ stage: "Build" }}
      />,
    );

    expect(
      within(durationsTable()).getAllByRole("rowheader").map(nameOf),
    ).toEqual(["Checkout", "Build", "Build total"]);
  });
});

describe("StageDurationsView shading", () => {
  it("keeps the strongest shading for a change that has lasted", () => {
    renderView({
      1: [stage("Build", 4)],
      2: [stage("Build", 4)],
      3: [stage("Build", 4)],
      4: [stage("Build", 9)],
      5: [stage("Build", 4)],
      6: [stage("Build", 4)],
    });

    expect(cellsOf("Build")[3]).toHaveClass(
      "pgv-stage-durations__cell--slower",
    );
  });

  it("marks only the build a change started in with an arrow", () => {
    const container = renderView(steadyThenSlower);

    expect(
      container.querySelectorAll("tbody .pgv-stage-durations__arrow"),
    ).toHaveLength(1);
    expect(
      cellsOf("Build")[4].querySelector(".pgv-stage-durations__arrow"),
    ).not.toBeNull();
  });
});

describe("formatDuration", () => {
  it("gives a short duration to a tenth of a second", () => {
    expect(formatDuration(1_940, "en")).toBe("1.9s");
    expect(formatDuration(570, "en")).toBe("0.6s");
  });

  it("leaves longer durations as they are", () => {
    expect(formatDuration(67_000, "en")).toBe("1m 7s");
  });
});

describe("percentChange", () => {
  it("is signed", () => {
    expect(percentChange(9_000, 4_000)).toBe("+125%");
    expect(percentChange(2_000, 5_000)).toBe("-60%");
  });

  it("is left out when there's nothing to compare with", () => {
    expect(percentChange(2_000, 0)).toBe("");
  });
});

describe("StageDurationsView with a build still going", () => {
  it("leaves it out of the median even once it's unstable", () => {
    const runs = [
      { ...run(4, Result.unstable), duration: 0, building: true },
      run(3),
      run(2),
      run(1),
    ];
    render(
      <View
        runs={runs}
        stagesByRun={Object.fromEntries(
          [1, 2, 3, 4].map((id) => [id, [stage("Build", 4)]]),
        )}
        jobPath="/jenkins/job/example/"
      />,
    );

    const total = within(rowOf("Build total")).getAllByRole("cell");
    expect(total[4]).toHaveTextContent("1m");
  });
});

describe("StageDurationsView narrowed to changes", () => {
  it("can be widened again when nothing changed", () => {
    const names = Array.from({ length: 13 }, (_, index) => `Stage ${index}`);
    render(
      <View
        runs={[6, 5, 4, 3, 2, 1].map((id) => run(id))}
        stagesByRun={Object.fromEntries(
          [1, 2, 3, 4, 5, 6].map((id) => [
            id,
            names.map((name) => stage(name, 4)),
          ]),
        )}
        jobPath="/jenkins/job/example/"
        initial={{ changedOnly: true }}
      />,
    );

    const changedOnly = screen.getByRole("checkbox", { name: "Changed only" });
    expect(changedOnly).toBeChecked();
    fireEvent.click(changedOnly);
    expect(
      within(durationsTable()).getAllByRole("rowheader").map(nameOf),
    ).toHaveLength(14);
  });
});
