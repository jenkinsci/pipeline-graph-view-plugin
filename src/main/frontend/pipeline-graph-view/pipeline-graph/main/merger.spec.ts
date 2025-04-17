import { Result, StageInfo } from "./PipelineGraphModel";
import { mergeStageInfos } from "../../../common/tree-api";

describe("mergeStageInfos", () => {
  it("merges matching items by name", () => {
    const skeletons: StageInfo[] = [
      {
        name: "Build",
        state: Result.success,
        children: [],
        completePercent: 100,
        id: 1,
        title: "Build",
        type: "STAGE",
        pauseDurationMillis: 0,
        startTimeMillis: 0,
        totalDurationMillis: 0,
        agent: "",
        url: "",
      },
      {
        name: "Test",
        state: Result.skipped,
        children: [],
        completePercent: 100,
        id: 2,
        title: "Test",
        type: "STAGE",
        pauseDurationMillis: 0,
        startTimeMillis: 0,
        totalDurationMillis: 0,
        agent: "",
        url: "",
      },
    ];

    const incoming: StageInfo[] = [
      {
        name: "Build",
        state: Result.running,
        children: [],
        completePercent: 50,
        id: 3,
        title: "Build",
        type: "STAGE",
        pauseDurationMillis: 0,
        startTimeMillis: 0,
        totalDurationMillis: 0,
        agent: "",
        url: "",
      },
    ];

    const result = mergeStageInfos(skeletons, incoming);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Build");
    expect(result[0].state).toBe("running");
    expect(result[0].skeleton).toBe(false); // Comes from incoming
    expect(result[1].skeleton).toBe(false); // Comes from incoming
  });

  it("recursively merges children", () => {
    const skeletons: StageInfo[] = [
      {
        name: "Parent",
        state: Result.success,
        skeleton: true,
        completePercent: 100,
        id: 1,
        title: "Parent",
        type: "STAGE",
        pauseDurationMillis: 0,
        startTimeMillis: 0,
        totalDurationMillis: 0,
        agent: "",
        url: "",
        children: [
          {
            name: "Child",
            state: Result.success,
            skeleton: true,
            completePercent: 100,
            id: 2,
            title: "Child",
            type: "STAGE",
            pauseDurationMillis: 0,
            startTimeMillis: 0,
            totalDurationMillis: 0,
            agent: "",
            url: "",
            children: [],
          },
        ],
      },
    ];

    const incoming: StageInfo[] = [
      {
        name: "Parent",
        state: Result.running,
        skeleton: false,
        completePercent: 50,
        id: 3,
        title: "Parent",
        type: "STAGE",
        pauseDurationMillis: 0,
        startTimeMillis: 0,
        totalDurationMillis: 0,
        agent: "",
        url: "",
        children: [
          {
            name: "Child",
            state: Result.running,
            skeleton: false,
            completePercent: 20,
            id: 4,
            title: "Child",
            type: "STAGE",
            pauseDurationMillis: 0,
            startTimeMillis: 0,
            totalDurationMillis: 0,
            agent: "",
            url: "",
            children: [],
          },
        ],
      },
    ];

    const result = mergeStageInfos(skeletons, incoming);

    expect(result[0].name).toBe("Parent");
    expect(result[0].state).toBe("running");
    expect(result[0].children[0].name).toBe("Child");
    expect(result[0].children[0].state).toBe("running");
  });
});
