/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";

import ConsoleLogStream, {
  ConsoleLogStreamProps,
} from "./ConsoleLogStream.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

const TestComponent = (props: ConsoleLogStreamProps) => {
  return (
    <div id="test-parent">
      <ConsoleLogStream {...props} />
    </div>
  );
};

describe("ConsoleLogStream", () => {
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
    stepId: baseStep.id,
    stepState: baseStep.state,
    logBuffer: baseBuffer,
    updateLogBufferIfChanged: vi.fn(),
    isExpanded: false,
    fetchLogText: vi.fn().mockResolvedValue(baseBuffer),
    fetchExceptionText: vi.fn().mockResolvedValue(baseBuffer),
    tailLogs: false,
    stopTailingLogs: () => {},
    scrollToTail: () => {},
    currentRunPath: "/jenkins/job/name/1/",
  } as ConsoleLogStreamProps;

  it("renders step console", async () => {
    const { findByText } = render(TestComponent({ ...DefaultTestProps }));
    expect(findByText(/Hello, world!/));
    expect(DefaultTestProps.fetchExceptionText).not.toBeCalled();
  });

  it("fetches exception text", async () => {
    const { findByText } = render(
      TestComponent({
        ...DefaultTestProps,
        stepState: Result.failure,
      }),
    );
    expect(findByText(/Hello, world!/));
    expect(DefaultTestProps.fetchExceptionText).toBeCalledWith(baseStep.id);
  });

  const sectionLines = [
    "##[group]Build",
    ...Array.from({ length: 30 }, (_, i) => `build ${i}`),
    "##[endgroup]",
  ];

  it("groups marker lines and keeps exception text outside sections", () => {
    const { container } = render(
      TestComponent({
        ...DefaultTestProps,
        logBuffer: {
          lines: [...sectionLines, "##[group]Unclosed", "Error: boom"],
          startByte: 0,
          endByte: 100,
          stopTailing: true,
          exceptionText: ["Error: boom"],
        },
      }),
    );
    const sections = container.querySelectorAll("details");
    expect(sections).toHaveLength(2);
    expect(sections[0].open).toBe(false);
    const log = container.querySelector("[role=log]")!;
    expect(log.lastElementChild?.textContent).toContain("Error: boom");
  });

  it("opens the collapsed section that contains the linked line", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.location.hash = "#log-2-10";
    try {
      const { container } = render(
        TestComponent({
          ...DefaultTestProps,
          logBuffer: {
            lines: sectionLines,
            startByte: 0,
            endByte: 100,
            stopTailing: true,
          },
        }),
      );
      expect(container.querySelector("details")!.open).toBe(true);
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      window.location.hash = "";
    }
  });
});
