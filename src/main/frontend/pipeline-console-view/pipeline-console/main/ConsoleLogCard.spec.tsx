/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { vi } from "vitest";

import ConsoleLogCard, { ConsoleLogCardProps } from "./ConsoleLogCard.tsx";
import { ConsoleLogStreamProps } from "./ConsoleLogStream.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

vi.mock("./ConsoleLogStream.tsx", () => {
  return vi.fn((props: ConsoleLogStreamProps) => {
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
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
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
    onStepToggle: () => {
      console.log("onStepToggle triggered");
    },
    onMoreConsoleClick: () => {
      console.log("onMoreConsoleClick triggered");
    },
    fetchExceptionText: () => {},
  } as ConsoleLogCardProps;

  it("renders step header only when not expanded", async () => {
    const { getByText } = render(<ConsoleLogCard {...DefaultTestProps} />);
    expect(getByText(/This is a step/));
  });

  it("renders step console when expanded", async () => {
    const { getByText, findByText } = render(
      <ConsoleLogCard {...DefaultTestProps} />,
    );
    expect(getByText(/This is a step/));
    expect(findByText(/Hello, world!/));
  });

  it("calls onMoreConsoleClick on load was card isExpanded set", async () => {
    console.log = vi.fn();
    render(<ConsoleLogCard {...DefaultTestProps} isExpanded />);
    expect(console.log).toHaveBeenCalledWith("onMoreConsoleClick triggered");
  });

  it("does not call onMoreConsoleClick on load was card isExpanded set", async () => {
    console.log = vi.fn();
    render(<ConsoleLogCard {...DefaultTestProps} />);
    expect(console.log).not.toHaveBeenCalledWith(
      "onMoreConsoleClick triggered",
    );
  });
});
