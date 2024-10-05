/** * @jest-environment jsdom */

import "@testing-library/jest-dom";
import React, { ReactElement } from "react";
import ConsoleLogStream, { ConsoleLogStreamProps } from "./ConsoleLogStream";
import { Result, StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { render } from "@testing-library/react";
import { VirtuosoMockContext } from "react-virtuoso";

function renderInContext(element: ReactElement) {
  return render(element, {
    wrapper: ({ children }) => (
      <VirtuosoMockContext.Provider
        value={{ viewportHeight: 300, itemHeight: 100 }}
      >
        {children}
      </VirtuosoMockContext.Provider>
    ),
  });
}

const TestComponent = (props: ConsoleLogStreamProps) => {
  return (
    <div id="test-parent">
      <ConsoleLogStream {...props} />
    </div>
  );
};

window.HTMLElement.prototype.scrollBy = jest.fn();

describe("ConsoleLogStream", () => {
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
    logBuffer: baseBuffer,
    isExpanded: false,
    maxHeightScale: 1,
    handleMoreConsoleClick: () => {
      console.log("handleMoreConsoleClick triggered");
    },
  } as ConsoleLogStreamProps;

  it("renders step console", async () => {
    const { findByText } = render(TestComponent({ ...DefaultTestProps }));
    expect(findByText(/Hello, world!/));
  });
});
