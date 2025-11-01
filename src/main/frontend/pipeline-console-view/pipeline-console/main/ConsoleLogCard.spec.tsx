/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { beforeEach, Mock, vi } from "vitest";

import ConsoleLogCard, { ConsoleLogCardProps } from "./ConsoleLogCard.tsx";
import { ConsoleLogStreamProps } from "./ConsoleLogStream.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
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
    onStepToggle: vi.fn(),
    fetchLogText: vi.fn(),
    fetchExceptionText: () => {},
  } as ConsoleLogCardProps;
  beforeEach(function () {
    (DefaultTestProps.fetchLogText as Mock).mockReset();
  });

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

  it("calls fetchLogText on load was card isExpanded set", async () => {
    render(<ConsoleLogCard {...DefaultTestProps} isExpanded />);
    expect(DefaultTestProps.fetchLogText as Mock).toHaveBeenCalledWith(
      DefaultTestProps.step.id,
      TAIL_CONSOLE_LOG,
    );
  });

  it("does not call fetchLogText on load was card isExpanded set", async () => {
    render(<ConsoleLogCard {...DefaultTestProps} />);
    expect(DefaultTestProps.fetchLogText as Mock).not.toHaveBeenCalled();
  });
});
