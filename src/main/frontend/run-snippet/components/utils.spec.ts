import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { collapseTopLevelStages, expandMatrixStages } from "./utils.ts";

describe("collapseTopLevelStages", () => {
  it("keeps the running stage visible ahead of placeholders", () => {
    const stages = Array.from({ length: 20 }, (_, i) =>
      stage(i, i < 9 ? Result.success : Result.not_built, i > 9),
    );
    stages[9] = stage(9, Result.running, false);

    const visible = collapseTopLevelStages(stages, 12)
      .filter((item) => item.kind === "stage")
      .map((item) => item.stage.id);

    expect(visible).toContain(9);
  });

  it("keeps a failed stage over the running one", () => {
    const stages = Array.from({ length: 20 }, (_, i) =>
      stage(i, Result.success, false),
    );
    stages[7] = stage(7, Result.failure, false);
    stages[14] = stage(14, Result.running, false);

    const visible = collapseTopLevelStages(stages, 8)
      .filter((item) => item.kind === "stage")
      .map((item) => item.stage.id);

    expect(visible).toContain(7);
  });

  it("counts collapsed markers towards the limit", () => {
    // A failure in the middle splits the hidden stages into two runs, each with its own marker
    const stages = Array.from({ length: 25 }, (_, i) =>
      stage(i, i === 8 ? Result.failure : Result.success, false),
    );

    const items = collapseTopLevelStages(stages, 5);

    expect(items).toHaveLength(5);
    expect(items).toContainEqual({ kind: "stage", stage: stages[8] });
  });

  it("never renders more items than the limit", () => {
    for (let special = 0; special < 25; special += 1) {
      const stages = Array.from({ length: 25 }, (_, i) =>
        stage(i, i === special ? Result.failure : Result.success, false),
      );

      for (let max = 3; max <= 25; max += 1) {
        const items = collapseTopLevelStages(stages, max);
        const hidden = items.reduce(
          (sum, item) =>
            sum + (item.kind === "collapsed" ? item.hiddenCount : 0),
          0,
        );
        const shown = items.filter((item) => item.kind === "stage").length;

        expect(items.length).toBeLessThanOrEqual(max);
        expect(shown + hidden).toBe(25);
        expect(items).toContainEqual({ kind: "stage", stage: stages[special] });
      }
    }
  });
});

describe("expandMatrixStages", () => {
  const configuration = (
    id: number,
    platform: string,
    build: StageInfo,
    test: StageInfo,
  ): StageInfo => ({
    ...stage(id, Result.success, false),
    name: `Matrix - PLATFORM = '${platform}', BROWSER = 'chrome'`,
    type: "PARALLEL",
    children: [
      { ...build, name: "Build" },
      { ...test, name: "Test" },
    ],
  });

  const matrix = (...configurations: StageInfo[]): StageInfo => ({
    ...stage(1, Result.success, false),
    name: "BuildAndTest",
    children: configurations,
  });

  it("replaces a matrix with the stages it runs", () => {
    const stages = expandMatrixStages([
      stage(0, Result.success, false),
      matrix(
        configuration(
          10,
          "linux",
          stage(11, Result.success, false),
          stage(12, Result.success, false),
        ),
        configuration(
          20,
          "mac",
          stage(21, Result.success, false),
          stage(22, Result.success, false),
        ),
      ),
      stage(2, Result.success, false),
    ]);

    expect(stages.map((s) => s.name)).toEqual([
      "Stage 0",
      "Build",
      "Test",
      "Stage 2",
    ]);
    expect(stages[1].children.map((s) => s.name)).toEqual([
      "linux, chrome",
      "mac, chrome",
    ]);
  });

  it("takes the most noteworthy configuration's state and links to it", () => {
    const [build, test] = expandMatrixStages([
      matrix(
        configuration(10, "linux", stage(11, Result.success, false), {
          ...stage(12, Result.running, false),
          totalDurationMillis: undefined,
        }),
        configuration(
          20,
          "mac",
          stage(21, Result.failure, false),
          stage(22, Result.skipped, false),
        ),
      ),
    ]);

    expect(build).toMatchObject({ state: Result.failure, id: 21 });
    expect(test).toMatchObject({
      state: Result.running,
      id: 12,
      totalDurationMillis: undefined,
    });
  });

  it("leaves stages without children alone", () => {
    // The build history only sends children for a matrix
    const { children: _, ...withoutChildren } = stage(0, Result.success, false);
    const stages = [withoutChildren as StageInfo];

    expect(expandMatrixStages(stages)).toEqual(stages);
  });

  it("doesn't let placeholders from the previous run speak for this one", () => {
    const placeholder = {
      ...stage(21, Result.failure, true),
      startTimeMillis: 0,
    };
    const [build] = expandMatrixStages([
      matrix(
        configuration(
          10,
          "linux",
          {
            ...stage(11, Result.running, false),
            startTimeMillis: 5000,
            totalDurationMillis: undefined,
          },
          stage(12, Result.not_built, true),
        ),
        configuration(
          20,
          "mac",
          placeholder,
          stage(22, Result.not_built, true),
        ),
      ),
    ]);

    expect(build).toMatchObject({
      state: Result.running,
      id: 11,
      startTimeMillis: 5000,
      totalDurationMillis: undefined,
      skeleton: false,
    });
  });

  it("is a placeholder when no configuration has started", () => {
    const [build] = expandMatrixStages([
      matrix(
        configuration(
          10,
          "linux",
          stage(11, Result.success, true),
          stage(12, Result.success, true),
        ),
      ),
    ]);

    expect(build.skeleton).toBe(true);
  });

  it("leaves other parallel stages alone", () => {
    const parallel: StageInfo = {
      ...stage(1, Result.success, false),
      children: [
        { ...stage(2, Result.success, false), type: "PARALLEL" },
        { ...stage(3, Result.success, false), type: "PARALLEL" },
      ],
    };

    expect(expandMatrixStages([parallel])).toEqual([parallel]);
  });
});

const stage = (id: number, state: Result, skeleton: boolean): StageInfo => ({
  name: `Stage ${id}`,
  title: `Stage ${id}`,
  state,
  skeleton,
  type: "STAGE",
  children: [],
  id,
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 0,
  agent: "",
  url: "",
});
