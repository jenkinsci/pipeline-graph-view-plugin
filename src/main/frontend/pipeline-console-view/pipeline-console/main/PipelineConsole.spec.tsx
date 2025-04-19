/** * @jest-environment jsdom */

(global as any).TextEncoder = require("util").TextEncoder;

import "@testing-library/jest-dom";
import React from "react";
import { default as PipelineConsole } from "./PipelineConsole";
import DataTreeView from "./DataTreeView";
import StageView, { StageViewProps } from "./StageView";
import { render } from "@testing-library/react";
import { RunStatus } from "../../../common/RestClient";
import {
  defaultStagesList,
  allSuccessfulStepList,
  findStage,
  findStageSteps,
} from "./TestData";

// This is used to allow 'getConsoleTextOffset' to return different values.
const getConsoleText = jest
  .fn((stepId): string => {
    return `Default value for step '${stepId}'`;
  })
  .mockName("default getConsoleText");

const getRunStatusFromPathMock = jest
  .fn((): RunStatus => {
    return {
      stages: defaultStagesList,
      complete: true,
    };
  })
  .mockName("default getRunStatusFromPath");

jest.mock("../../../common/RestClient", () => {
  return {
    getRunStatusFromPath: jest.fn().mockImplementation(() => {
      return getRunStatusFromPathMock();
    }),
    getRunSteps: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        steps: allSuccessfulStepList,
      });
    }),
    getConsoleTextOffset: jest.fn().mockImplementation(async (stepId: string, startByte: number) => {
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

describe("PipelineConsole", () => {
  // it("Passes expected params stages to DataTreeView", async () => {
  //   const { findByText } = render(<PipelineConsole />);
  //   await findByText("SimpleDataTreeView...");
  //   expect(DataTreeView).toHaveBeenLastCalledWith(
  //     {
  //       onNodeSelect: expect.anything(),
  //       selected: undefined,
  //       stages: [],
  //     },
  //     {},
  //   );
  // });
  //
  // it("Passes selected stage to StageView", async () => {
  //   const { findByText } = render(<PipelineConsole />);
  //   // SimpleStageView will print when when passed the stage.
  //   await findByText("SimpleStageView - selected: 0");
  //   expect(StageView).toHaveBeenLastCalledWith(
  //     {
  //       expandedSteps: ["21"],
  //       handleMoreConsoleClick: expect.anything(),
  //       handleStepToggle: expect.anything(),
  //       scrollParentId: "stage-view-pane",
  //       stage: findStage(defaultStagesList, 3),
  //       stepBuffers: expect.any(Map),
  //       steps: findStageSteps(allSuccessfulStepList, 3),
  //     },
  //     {},
  //   );
  // });

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

  // it("Passes selects nested user-defined stage", async () => {
  //   window.history.pushState({}, "Test Title", "test.html?selected-node=3");
  //   const { findByText } = render(<PipelineConsole />);
  //   // SimpleStageView will print when when passed the stage.
  //   await findByText("SimpleStageView - selected: 3");
  //   expect(StageView).toHaveBeenLastCalledWith(
  //     {
  //       expandedSteps: [],
  //       handleMoreConsoleClick: expect.anything(),
  //       handleStepToggle: expect.anything(),
  //       scrollParentId: "stage-view-pane",
  //       stage: findStage(defaultStagesList, 3),
  //       stepBuffers: expect.any(Map),
  //       steps: findStageSteps(allSuccessfulStepList, 3),
  //     },
  //     {},
  //   );
  // });
  //
  // it("Passes selects user-defined step", async () => {
  //   window.history.pushState({}, "Test Title", "test.html?selected-node=10");
  //   const { findByText } = render(<PipelineConsole />);
  //   // SimpleStageView will print when when passed the stage.
  //   await findByText("SimpleStageView - selected: 0");
  //   expect(StageView).toHaveBeenLastCalledWith(
  //     {
  //       expandedSteps: ["10"],
  //       handleMoreConsoleClick: expect.anything(),
  //       handleStepToggle: expect.anything(),
  //       scrollParentId: "stage-view-pane",
  //       stage: findStage(defaultStagesList, 0),
  //       stepBuffers: expect.any(Map),
  //       steps: findStageSteps(allSuccessfulStepList, 0),
  //     },
  //     {},
  //   );
  // });
});