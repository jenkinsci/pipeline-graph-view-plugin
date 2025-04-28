/** * @vitest-environment jsdom */

import { vi } from "vitest";
import React from "react";
import ConsoleLogStream, {
  ConsoleLogStreamProps,
} from "./ConsoleLogStream.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";
import { render } from "@testing-library/react";

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
  } as ConsoleLogStreamProps;

  it("renders step console", async () => {
    const { findByText } = render(TestComponent({ ...DefaultTestProps }));
    expect(findByText(/Hello, world!/));
  });
});
