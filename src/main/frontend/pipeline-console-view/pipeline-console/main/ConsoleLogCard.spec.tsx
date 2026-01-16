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
import { FilterProvider } from "./providers/filter-provider.tsx";

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

  const DefaultTestProps: ConsoleLogCardProps = {
    step: baseStep,
    stepBuffers: new Map().set(baseStep.id, baseBuffer),
    isExpanded: false,
    onStepToggle: vi.fn(),
    fetchLogText: vi.fn().mockResolvedValue(baseBuffer),
    fetchExceptionText: vi.fn().mockResolvedValue(baseBuffer),
    tailLogs: true,
    scrollToTail: () => {},
    stopTailingLogs: () => {},
  } as ConsoleLogCardProps;
  beforeEach(function () {
    (DefaultTestProps.fetchLogText as Mock).mockReset();
    (DefaultTestProps.fetchLogText as Mock).mockResolvedValue(baseBuffer);
  });

  it("renders step header only when not expanded", async () => {
    const { getByText } = render(
      <FilterProvider>
        <ConsoleLogCard {...DefaultTestProps} />
      </FilterProvider>,
    );
    expect(getByText(/This is a step/));
  });

  it("renders step console when expanded", async () => {
    const { getByText, findByText } = render(
      <FilterProvider>
        <ConsoleLogCard {...DefaultTestProps} />
      </FilterProvider>,
    );
    expect(getByText(/This is a step/));
    expect(findByText(/Hello, world!/));
  });

  it("calls fetchLogText on load was card isExpanded set", async () => {
    render(
      <FilterProvider>
        <ConsoleLogCard {...DefaultTestProps} isExpanded />
      </FilterProvider>,
    );
    expect(DefaultTestProps.fetchLogText as Mock).toHaveBeenCalledWith(
      DefaultTestProps.step.id,
      TAIL_CONSOLE_LOG,
    );
  });

  it("does not call fetchLogText on load was card isExpanded set", async () => {
    render(
      <FilterProvider>
        <ConsoleLogCard {...DefaultTestProps} />
      </FilterProvider>,
    );
    expect(DefaultTestProps.fetchLogText as Mock).not.toHaveBeenCalled();
  });
});
