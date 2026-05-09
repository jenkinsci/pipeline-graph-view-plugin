import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { StepInfo } from "../RestClient.tsx";
import { refreshStagesFromSteps } from "./refresh-stages-from-steps.ts";

it("should handle skeleton stage with steps", () => {
  const originalStages: StageInfo[] = [{ ...mockStage }];
  const stages = refreshStagesFromSteps(originalStages, [mockStep]);
  expect(stages).to.deep.equal([
    {
      ...mockStage,
      state: Result.running,
      startTimeMillis: 123,
      totalDurationMillis: undefined,
      pauseLiveTotal: false,
    },
  ]);
  expect(stages).to.not.equal(originalStages);
  expect(stages[0]).to.not.equal(originalStages[0]);
});

it("should handle skeleton stage with started children", () => {
  const originalStages: StageInfo[] = [
    { ...mockStage, children: [{ ...mockStage, id: 2 }] },
  ];
  const originalChildren = originalStages[0].children;
  const stages = refreshStagesFromSteps(originalStages, [
    { ...mockStep, stageId: "2" },
  ]);
  expect(stages).to.deep.equal([
    {
      ...mockStage,
      state: Result.running,
      startTimeMillis: 123,
      totalDurationMillis: undefined,
      pauseLiveTotal: false,
      children: [
        {
          ...mockStage,
          id: 2,
          state: Result.running,
          startTimeMillis: 123,
          totalDurationMillis: undefined,
          pauseLiveTotal: false,
        },
      ],
    },
  ]);
  expect(stages).to.not.equal(originalStages);
  expect(stages[0]).to.not.equal(originalStages[0]);
  expect(stages[0].children).to.not.equal(originalChildren);
  expect(stages[0].children[0]).to.not.equal(originalChildren[0]);
});

it("should handle skeleton stage with children", () => {
  const originalStages: StageInfo[] = [
    { ...mockStage, children: [{ ...mockStage, id: 2 }] },
  ];
  const stages = refreshStagesFromSteps(originalStages, []);
  // No changes
  expect(stages).to.equal(originalStages);
});

it("should handle finished not_built stage", () => {
  const originalStages: StageInfo[] = [
    {
      ...mockStage,
      state: Result.not_built,
      startTimeMillis: 42,
      totalDurationMillis: undefined,
      skeleton: false,
    },
  ];
  const stages = refreshStagesFromSteps(originalStages, [
    { ...mockStep, stageId: "1", state: Result.success },
  ]);
  expect(stages).to.deep.equal([
    {
      ...mockStage,
      state: Result.not_built,
      startTimeMillis: 42,
      skeleton: false,
      totalDurationMillis: undefined,
      pauseLiveTotal: true,
    },
  ]);
  expect(stages).to.not.equal(originalStages);
  expect(stages[0]).to.not.equal(originalStages[0]);
});

it("should handle finished running stage", () => {
  const originalStages: StageInfo[] = [
    {
      ...mockStage,
      state: Result.running,
      startTimeMillis: 42,
      totalDurationMillis: undefined,
      skeleton: false,
    },
  ];
  const stages = refreshStagesFromSteps(originalStages, [
    { ...mockStep, stageId: "1", state: Result.success },
  ]);
  expect(stages).to.deep.equal([
    {
      ...mockStage,
      state: Result.running,
      startTimeMillis: 42,
      skeleton: false,
      totalDurationMillis: undefined,
      pauseLiveTotal: true,
    },
  ]);
  expect(stages).to.not.equal(originalStages);
  expect(stages[0]).to.not.equal(originalStages[0]);
});

it("should handle finished stage with children", () => {
  const originalStages: StageInfo[] = [
    {
      ...mockStage,
      state: Result.running,
      startTimeMillis: 42,
      totalDurationMillis: undefined,
      skeleton: false,
      children: [
        {
          ...mockStage,
          state: Result.running,
          startTimeMillis: 42,
          totalDurationMillis: undefined,
          skeleton: false,
          id: 2,
        },
      ],
    },
  ];
  const originalChildren = originalStages[0].children;
  const stages = refreshStagesFromSteps(originalStages, [
    { ...mockStep, stageId: "2", state: Result.success },
  ]);
  expect(stages).to.deep.equal([
    {
      ...mockStage,
      state: Result.running,
      startTimeMillis: 42,
      totalDurationMillis: undefined,
      skeleton: false,
      pauseLiveTotal: true,
      children: [
        {
          ...mockStage,
          id: 2,
          state: Result.running,
          startTimeMillis: 42,
          totalDurationMillis: undefined,
          skeleton: false,
          pauseLiveTotal: true,
        },
      ],
    },
  ]);
  expect(stages).to.not.equal(originalStages);
  expect(stages[0]).to.not.equal(originalStages[0]);
  expect(stages[0].children).to.not.equal(originalChildren);
  expect(stages[0].children[0]).to.not.equal(originalChildren[0]);
});

const mockStage: StageInfo = {
  name: "Build",
  state: Result.not_built,
  skeleton: true,
  id: 1,
  title: "Build",
  type: "STAGE",
  agent: "agent-1",
  children: [],
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 120000,
  url: "",
};

const mockStep: StepInfo = {
  id: "",
  name: "",
  pauseDurationMillis: 0,
  stageId: "1",
  startTimeMillis: 123,
  state: Result.running,
  title: "",
  totalDurationMillis: 0,
  type: "",
};
