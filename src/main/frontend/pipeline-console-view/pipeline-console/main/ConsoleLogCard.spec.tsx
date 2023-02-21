/** * @jest-environment jsdom */

import "@testing-library/jest-dom/extend-expect";
import { waitFor } from "@testing-library/react";
import React, { ReactElement } from "react";
import { ConsoleLogCard } from "./ConsoleLogCard";
import type { ConsoleLogCardProps } from "./ConsoleLogCard";
import { Result, StepInfo } from "./PipelineConsoleModel";
import { render } from "@testing-library/react";
import { VirtuosoMockContext } from "react-virtuoso";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
describe("ConsoleLogCard", () => {
  const baseStep: StepInfo = {
    name: "This is a step",
    title: "This is a title",
    state: Result.success,
    completePercent: 50,
    id: 2,
    type: "STAGE",
    pauseDurationMillis: "",
    startTimeMillis: "",
    totalDurationMillis: "",
    stageId: "1",
    consoleLines: ["Hello, world!"],
    consoleStartByte: 0,
    consoleEndByte: 13,
  };

  const TestComponent = (props: ConsoleLogCardProps) => {
    return (
      <div id="test-parent">
        <ConsoleLogCard {...props} />
      </div>
    );
  };

  const DefaultTestProps = {
    step: baseStep,
    isExpanded: false,
    handleStepToggle: () => {
      console.log("handleStepToggle triggered");
    },
    handleMoreConsoleClick: () => {
      console.log("handleMoreConsoleClick triggered");
    },
    scrollParentId: "test-parent",
  } as ConsoleLogCardProps;

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

  it("renders step header only when not expanded", async () => {
    const { getByText } = renderInContext(
      TestComponent({ ...DefaultTestProps })
    );
    expect(getByText(/This is a step/));
  });

  it("renders step console when expanded", async () => {
    const { getByText } = renderInContext(
      TestComponent({ ...DefaultTestProps, isExpanded: true })
    );
    expect(getByText(/This is a step/));
    waitFor(() => {
      expect(getByText(/Hello, world!/));
    });
  });
});
