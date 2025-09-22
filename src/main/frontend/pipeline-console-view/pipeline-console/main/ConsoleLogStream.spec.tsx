/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { vi } from "vitest";

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

window.HTMLElement.prototype.scrollBy = vi.fn();

describe("ConsoleLogStream", () => {
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
    logBuffer: baseBuffer,
    isExpanded: false,
    maxHeightScale: 1,
    onMoreConsoleClick: () => {
      console.log("onMoreConsoleClick triggered");
    },
    fetchExceptionText: vi.fn(),
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
        step: {
          ...baseStep,
          state: Result.failure,
        },
      }),
    );
    expect(findByText(/Hello, world!/));
    expect(DefaultTestProps.fetchExceptionText).toBeCalledWith(baseStep.id);
  });
});
