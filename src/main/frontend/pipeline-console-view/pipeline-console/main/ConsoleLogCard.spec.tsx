/** * @jest-environment jsdom */

import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { ConsoleLogCard } from "./ConsoleLogCard";
import type { ConsoleLogCardProps } from "./ConsoleLogCard";
import { ConsoleLogStreamProps } from "./ConsoleLogStream";
import { Result, StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { render } from "@testing-library/react";

jest.mock("./ConsoleLogStream", () => {
  return jest.fn((props: ConsoleLogStreamProps) => {
    return (
      <div>
        <div>SimpleConsoleLogStream...</div>
        <div>Hello, world!</div>
      </div>
    );
  });
});

describe("ConsoleLogCard", () => {
  const baseStep: StepInfo = {
    name: "This is a step",
    title: "This is a title",
    state: Result.success,
    completePercent: 50,
    id: "2",
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
  };

  const baseBuffer: StepLogBufferInfo = {
    lines: ["Hello, world!"],
    startByte: 0,
    endByte: 13,
  };

  const DefaultTestProps = {
    step: baseStep,
    stepBuffer: baseBuffer,
    isExpanded: false,
    handleStepToggle: () => {
      console.log("handleStepToggle triggered");
    },
    handleMoreConsoleClick: () => {
      console.log("handleMoreConsoleClick triggered");
    },
    scrollParentId: "test-parent",
  } as ConsoleLogCardProps;

  it("renders step header only when not expanded", async () => {
    const { getByText } = render(<ConsoleLogCard {...DefaultTestProps} />);
    expect(getByText(/This is a step/));
  });

  it("renders step console when expanded", async () => {
    const { getByText, findByText } = render(
      <ConsoleLogCard {...DefaultTestProps} />
    );
    expect(getByText(/This is a step/));
    expect(findByText(/Hello, world!/));
  });

  it("calls handleMoreConsoleClick on load was card isExpanded set", async () => {
    console.log = jest.fn();
    render(<ConsoleLogCard {...DefaultTestProps} isExpanded={true} />);
    expect(console.log).toHaveBeenCalledWith(
      "handleMoreConsoleClick triggered"
    );
  });

  it("does not call handleMoreConsoleClick on load was card isExpanded set", async () => {
    console.log = jest.fn();
    render(<ConsoleLogCard {...DefaultTestProps} />);
    expect(console.log).not.toHaveBeenCalledWith(
      "handleMoreConsoleClick triggered"
    );
  });
});
