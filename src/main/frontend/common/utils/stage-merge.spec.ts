import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { mergeStageInfos } from "./stage-merge.ts";

describe("mergeStageInfos", () => {
  it("merges matching items by name", () => {
    const skeletons = [stage("Build"), stage("Test")];
    const incoming = [stage("Build", { state: Result.running, id: 42 })];

    const result = mergeStageInfos(skeletons, incoming);
    expect(result).toHaveLength(2);

    const [build, test] = result;
    expect(build.name).toBe("Build");
    expect(build.state).toBe(Result.running);
    expect(build.skeleton).toBe(false);

    expect(test.name).toBe("Test");
    expect(test.skeleton).toBe(true);
  });

  it("recursively merges children", () => {
    const skeletons = [
      stage("Parent", {
        children: [stage("Child", { skeleton: true })],
      }),
    ];
    const incoming = [
      stage("Parent", {
        state: Result.running,
        children: [stage("Child", { state: Result.running })],
      }),
    ];

    const [parent] = mergeStageInfos(skeletons, incoming);
    expect(parent.state).toBe(Result.running);

    const [child] = parent.children;
    expect(child.name).toBe("Child");
    expect(child.state).toBe(Result.running);
  });

  it("drops skeletons if new stages differ", () => {
    const skeletons = [
      stage("Start"),
      stage("Tool Install"),
      stage("Build"),
      stage("Test"),
      stage("Lint"),
      stage("End"),
    ];

    const incoming = [
      stage("Start"),
      stage("Tool Install"),
      stage("Build"),
      stage("Test"),
      stage("Different stage"),
    ];

    const names = mergeStageInfos(skeletons, incoming).map((s) => s.name);
    expect(names).toEqual([
      "Start",
      "Tool Install",
      "Build",
      "Test",
      "Different stage",
    ]);
  });
});

const stage = (
  name: string,
  overrides: Partial<StageInfo> = {},
): StageInfo => ({
  name,
  title: name,
  state: Result.success,
  type: "STAGE",
  children: [],
  id: name.length, // simple unique-ish id
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 0,
  agent: "",
  url: "",
  ...overrides,
});
