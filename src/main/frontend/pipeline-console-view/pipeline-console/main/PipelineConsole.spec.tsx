/** * @jest-environment jsdom */

import "@testing-library/jest-dom";
import React from "react";
import { default as PipelineConsole } from "./PipelineConsole";
import DataTreeView from "./DataTreeView";
import StageView, { StageViewProps } from "./StageView";
import { StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { render } from "@testing-library/react";
import { RunStatus } from "../../../common/RestClient";
import {
  defaultStagesList,
  allSuccessfulStepList,
  multipleErrorsStepList,
  multipleRunningSteps,
  findStage,
  findStageSteps,
  runningStepList,
  unstableThenFailureStepList,
} from "./TestData";

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

jest.mock("./DataTreeView", () => {
  return jest.fn((props) => {
    return (
      <div>
        SimpleDataTreeView...<div>{JSON.stringify(props)}</div>
      </div>
    );
  });
});

jest.mock("./StageView", () => {
  return jest.fn((props: StageViewProps) => {
    return <div>SimpleStageView - selected: {props.stage?.id ?? ""}</div>;
  });
});

// describe("getDefaultSelectedStep", () => {
//   it("selects last successful step", async () => {
//     const selectedStep = getDefaultSelectedStep(
//       allSuccessfulStepList,
//     ) as StepInfo;
//     expect(selectedStep.id).toEqual("21");
//   });
//
//   it("selects first errored step", async () => {
//     const selectedStep = getDefaultSelectedStep(
//       multipleErrorsStepList,
//     ) as StepInfo;
//     expect(selectedStep.id).toEqual("11");
//   });
//
//   it("selects errored step over unstable", async () => {
//     const selectedStep = getDefaultSelectedStep(
//       unstableThenFailureStepList,
//     ) as StepInfo;
//     expect(selectedStep.id).toEqual("12");
//   });
//
//   it("selects running step over unstable", async () => {
//     const selectedStep = getDefaultSelectedStep(runningStepList) as StepInfo;
//     expect(selectedStep.id).toEqual("12");
//   });
//
//   it("selects first running step", async () => {
//     const selectedStep = getDefaultSelectedStep(
//       multipleRunningSteps,
//     ) as StepInfo;
//     expect(selectedStep.id).toEqual("10");
//   });
//
//   it("returns null when there are no steps", async () => {
//     const selectedStep = getDefaultSelectedStep([]) as StepInfo;
//     expect(selectedStep).toEqual(null);
//   });
// });

// describe("updateStepBuffer", () => {
//   it("resets buffer when startByte is 0", async () => {
//     // Prime console text buffer with data.
//     let oldText = "This should be overridden";
//     let stepBuffer = {
//       lines: [oldText] as string[],
//       startByte: 0,
//       endByte: oldText.length,
//       stepId: "1",
//     } as StepLogBufferInfo;
//     // Request the new log from the beginning.
//     let previousConsoleText = "This is some dummy text for step '1'";
//     getConsoleText.mockReturnValueOnce(previousConsoleText);
//     stepBuffer = updateStepBuffer("1", 0, stepBuffer);
//     await Promise.resolve();
//     expect(stepBuffer?.lines).toEqual([previousConsoleText]);
//   });
//
//   it("appends to buffer when startByte is non-zero", async () => {
//     // Prime console text buffer with data.
//     let previousConsoleText = "Dummy Text";
//     let stepBuffer = {
//       lines: [previousConsoleText] as string[],
//       startByte: 0,
//       endByte: previousConsoleText.length,
//       stepId: "1",
//     } as StepLogBufferInfo;
//     // Request the new log from the beginning.
//     getConsoleText.mockReturnValue(previousConsoleText);
//     stepBuffer = updateStepBuffer("1", previousConsoleText.length, stepBuffer);
//     await Promise.resolve();
//     expect(stepBuffer?.lines).toEqual([
//       previousConsoleText,
//       previousConsoleText,
//     ]);
//   });
//
//   it("ignores trailing whitespace", async () => {
//     // Prime console text buffer with data.
//     let previousConsoleText = "Dummy Text";
//     let stepBuffer = {
//       lines: [] as string[],
//       startByte: 0,
//       endByte: 0,
//       stepId: "1",
//     } as StepLogBufferInfo;
//     // Request the new log from the beginning.
//     getConsoleText.mockReturnValue(previousConsoleText + "\n\n\n\n\n");
//     stepBuffer = updateStepBuffer("1", 0, stepBuffer);
//     await Promise.resolve();
//     expect(stepBuffer?.lines).toEqual([previousConsoleText]);
//   });
// });

describe("PipelineConsole", () => {
  it("Passes expected params stages to DataTreeView", async () => {
    const { findByText } = render(<PipelineConsole />);
    await findByText("SimpleDataTreeView...");
    expect(DataTreeView).toHaveBeenLastCalledWith(
      {
        onNodeSelect: expect.anything(),
        selected: undefined,
        stages: [],
      },
      {},
    );
  });

  it("Passes selected stage to StageView", async () => {
    const { findByText } = render(<PipelineConsole />);
    // SimpleStageView will print when when passed the stage.
    await findByText("SimpleStageView - selected: 0");
    expect(StageView).toHaveBeenLastCalledWith(
      {
        expandedSteps: ["21"],
        handleMoreConsoleClick: expect.anything(),
        handleStepToggle: expect.anything(),
        scrollParentId: "stage-view-pane",
        stage: findStage(defaultStagesList, 3),
        stepBuffers: expect.any(Map),
        steps: findStageSteps(allSuccessfulStepList, 3),
      },
      {},
    );
  });

  it("Passes selects user-defined stage", async () => {
    window.history.pushState({}, "Test Title", "test.html?selected-node=1");
    const { findByText } = render(<PipelineConsole />);
    // SimpleStageView will print when when passed the stage.
    await findByText("SimpleStageView - selected: 1");
    expect(StageView).toHaveBeenLastCalledWith(
      {
        expandedSteps: [],
        handleMoreConsoleClick: expect.anything(),
        handleStepToggle: expect.anything(),
        scrollParentId: "stage-view-pane",
        stage: findStage(defaultStagesList, 1),
        stepBuffers: expect.any(Map),
        steps: findStageSteps(allSuccessfulStepList, 1),
      },
      {},
    );
  });

  it("Passes selects nested user-defined stage", async () => {
    window.history.pushState({}, "Test Title", "test.html?selected-node=3");
    const { findByText } = render(<PipelineConsole />);
    // SimpleStageView will print when when passed the stage.
    await findByText("SimpleStageView - selected: 3");
    expect(StageView).toHaveBeenLastCalledWith(
      {
        expandedSteps: [],
        handleMoreConsoleClick: expect.anything(),
        handleStepToggle: expect.anything(),
        scrollParentId: "stage-view-pane",
        stage: findStage(defaultStagesList, 3),
        stepBuffers: expect.any(Map),
        steps: findStageSteps(allSuccessfulStepList, 3),
      },
      {},
    );
  });

  it("Passes selects user-defined step", async () => {
    window.history.pushState({}, "Test Title", "test.html?selected-node=10");
    const { findByText } = render(<PipelineConsole />);
    // SimpleStageView will print when when passed the stage.
    await findByText("SimpleStageView - selected: 0");
    expect(StageView).toHaveBeenLastCalledWith(
      {
        expandedSteps: ["10"],
        handleMoreConsoleClick: expect.anything(),
        handleStepToggle: expect.anything(),
        scrollParentId: "stage-view-pane",
        stage: findStage(defaultStagesList, 0),
        stepBuffers: expect.any(Map),
        steps: findStageSteps(allSuccessfulStepList, 0),
      },
      {},
    );
  });
});
