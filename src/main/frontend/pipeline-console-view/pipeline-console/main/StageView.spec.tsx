/** * @jest-environment jsdom */

(global as any).TextEncoder = require("util").TextEncoder;

import "@testing-library/jest-dom";
import React from "react";
import { Result, StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { render } from "@testing-library/react";
import StageView, { StageViewProps } from "./StageView";
import { ConsoleLogCardProps } from "./ConsoleLogCard";
import {
  defaultStagesList,
  findStageSteps,
  allSuccessfulStepList,
} from "./TestData";

const TestComponent = (props: StageViewProps) => {
  return (
    <div id="test-parent">
      <StageView {...props} />
    </div>
  );
};

window.HTMLElement.prototype.scrollBy = jest.fn();

jest.mock("./ConsoleLogCard", () => {
  return {
    ConsoleLogCard: jest.fn((props: ConsoleLogCardProps) => {
      return (
        <div>
          <div>SimpleConsoleLogCard...</div>
          <div>Hello, world!</div>
        </div>
      );
    }),
  };
});

describe("StageView", () => {
  const baseStage = defaultStagesList[0];
  const stageSteps = findStageSteps(allSuccessfulStepList, baseStage.id);
  const expandedStepId = stageSteps[0].id;
  const baseBuffer: StepLogBufferInfo = {
    lines: ["Hello, world!"],
    startByte: 0,
    endByte: 13,
  };

  const stepBuffers: Map<string, StepLogBufferInfo> = new Map<
    string,
    StepLogBufferInfo
  >();
  stepBuffers.set(expandedStepId, baseBuffer);

  const DefaultTestProps = {
    stage: baseStage,
    steps: stageSteps,
    stepBuffers: stepBuffers,
    selectedStage: `${baseStage.id}`,
    expandedSteps: [],
    handleStepToggle: () => {
      console.log("handleStepToggle triggered");
    },
    handleMoreConsoleClick: () => {
      console.log("handleMoreConsoleClick triggered");
    },
    scrollParentId: "dummy-id",
  } as StageViewProps;

  it("renders step view", async () => {
    const { findByText } = render(<StageView {...DefaultTestProps} />);
    expect(findByText(/Hello, world!/));
  });
});
