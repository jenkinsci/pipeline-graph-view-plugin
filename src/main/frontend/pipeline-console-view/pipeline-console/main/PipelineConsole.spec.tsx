/** * @jest-environment jsdom */

import "@testing-library/jest-dom/extend-expect";
import { waitFor } from "@testing-library/react";
import React, { ReactElement } from "react";
import {
  default as PipelineConsole,
  getDefaultSelectedStep,
  updateStepBuffer,
} from "./PipelineConsole";
import DataTreeView from "./DataTreeView";
import { DataTreeViewProps } from "./DataTreeView";
import StageView from "./StageView";
import {
  Result,
  StepInfo,
  StageType,
  StageInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel";
import { render } from "@testing-library/react";
import { RunStatus } from "../../../common/RestClient";
const defaultStagesList = [
  {
    name: "Stage A",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 0,
    type: "STAGE" as StageType,
    children: [],
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
  },
  {
    name: "Stage B",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 1,
    type: "STAGE" as StageType,
    children: [],
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
  },
  {
    name: "Parent C",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 2,
    type: "PARALLEL_BLOCK" as StageType,
    children: [
      {
        name: "Child D",
        title: "",
        state: Result.success,
        completePercent: 50,
        id: 3,
        type: "PARALLEL" as StageType,
        children: [] as StageInfo[],
        pauseDurationMillis: "",
        startTimeMillis: "",
        totalDurationMillis: "",
      },
    ],
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
  },
];

const allSuccessfulStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.success,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.success,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is a parallel step",
    title: "Dummy Parallel Step 1",
    state: Result.success,
    completePercent: 50,
    id: "20",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "3",
  },
  {
    name: "This is step 2",
    title: "Dummy Parallel Step 2",
    state: Result.success,
    completePercent: 50,
    id: "21",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "3",
  },
];

const multipleErrorsStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.success,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.failure,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 3",
    title: "Dummy Step 3",
    state: Result.failure,
    completePercent: 50,
    id: "12",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
];

const unstableThenFailureStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.unknown,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.unstable,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 3",
    title: "Dummy Step 3",
    state: Result.failure,
    completePercent: 50,
    id: "12",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
];

const runningStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.success,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.unstable,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 3",
    title: "Dummy Step 3",
    state: Result.running,
    completePercent: 50,
    id: "12",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
];

const multipleRunningSteps: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.running,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.running,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  },
];

// This is used to allow 'getConsoleTextOffset' to return different values.
const getConsoleText = jest
  .fn((stepId): string => {
    return `Default value for step '${stepId}'`;
  })
  .mockName("default getConsoleText");

const getRunStatusMock = jest
  .fn((): RunStatus => {
    return {
      stages: defaultStagesList,
      isComplete: true,
    };
  })
  .mockName("default getRunStatusMock");

jest.mock("../../../common/RestClient", () => {
  return {
    getRunStatus: jest.fn().mockImplementation(() => {
      return getRunStatusMock();
    }),
    getRunSteps: jest.fn().mockImplementation(() => {
      return {
        steps: allSuccessfulStepList,
      };
    }),
    getConsoleTextOffset: jest
      .fn()
      .mockImplementation(async (stepId: string, startByte: number) => {
        // This is a mock function is created above.
        let returnText = getConsoleText(stepId);
        return {
          text: returnText,
          startByte: startByte,
          endByte: startByte + returnText.length,
        };
      }),
  };
});

jest.mock("./DataTreeView");
jest.mock("./StageView");

describe("getDefaultSelectedStep", () => {
  it("selects last successful step", async () => {
    const selectedStep = getDefaultSelectedStep(
      allSuccessfulStepList
    ) as StepInfo;
    expect(selectedStep.id).toEqual("21");
  });

  it("selects first errored step", async () => {
    const selectedStep = getDefaultSelectedStep(
      multipleErrorsStepList
    ) as StepInfo;
    expect(selectedStep.id).toEqual("11");
  });

  it("selects errored step over unstable", async () => {
    const selectedStep = getDefaultSelectedStep(
      unstableThenFailureStepList
    ) as StepInfo;
    expect(selectedStep.id).toEqual("12");
  });

  it("selects running step over unstable", async () => {
    const selectedStep = getDefaultSelectedStep(runningStepList) as StepInfo;
    expect(selectedStep.id).toEqual("12");
  });

  it("selects first running step", async () => {
    const selectedStep = getDefaultSelectedStep(
      multipleRunningSteps
    ) as StepInfo;
    expect(selectedStep.id).toEqual("10");
  });

  it("returns null when there are no steps", async () => {
    const selectedStep = getDefaultSelectedStep([]) as StepInfo;
    expect(selectedStep).toEqual(null);
  });
});

describe("updateStepBuffer", () => {
  it("resets buffer when startByte is 0", async () => {
    // Prime console text buffer with data.
    let oldText = "This should be overridden";
    let stepBuffer = {
      lines: [oldText] as string[],
      startByte: 0,
      endByte: oldText.length,
      stepId: "1",
    } as StepLogBufferInfo;
    // Request the new log from the beginning.
    let previousConsoleText = "This is some dummy text for step '1'";
    getConsoleText.mockReturnValueOnce(previousConsoleText);
    stepBuffer = updateStepBuffer("1", 0, stepBuffer);
    await Promise.resolve();
    expect(stepBuffer?.lines).toEqual([previousConsoleText]);
  });

  it("appends to buffer when startByte is non-zero", async () => {
    // Prime console text buffer with data.
    let previousConsoleText = "Dummy Text";
    let stepBuffer = {
      lines: [previousConsoleText] as string[],
      startByte: 0,
      endByte: previousConsoleText.length,
      stepId: "1",
    } as StepLogBufferInfo;
    // Request the new log from the beginning.
    getConsoleText.mockReturnValue(previousConsoleText);
    stepBuffer = updateStepBuffer("1", previousConsoleText.length, stepBuffer);
    await Promise.resolve();
    expect(stepBuffer?.lines).toEqual([
      previousConsoleText,
      previousConsoleText,
    ]);
  });

  it("ignores trailing whitespace", async () => {
    // Prime console text buffer with data.
    let previousConsoleText = "Dummy Text";
    let stepBuffer = {
      lines: [] as string[],
      startByte: 0,
      endByte: 0,
      stepId: "1",
    } as StepLogBufferInfo;
    // Request the new log from the beginning.
    getConsoleText.mockReturnValue(previousConsoleText + "\n\n\n\n\n");
    stepBuffer = updateStepBuffer("1", 0, stepBuffer);
    await Promise.resolve();
    expect(stepBuffer?.lines).toEqual([previousConsoleText]);
  });
});
