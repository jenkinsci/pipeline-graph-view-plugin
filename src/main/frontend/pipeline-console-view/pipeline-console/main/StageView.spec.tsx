/** * @vitest-environment jsdom */

import { vi } from "vitest";
import { TextEncoder } from "util";
import React from "react";
import { act, render, screen } from "@testing-library/react";
import StageView from "./StageView.tsx";
import { Result, StageInfo, StepInfo } from "./PipelineConsoleModel.tsx";

(globalThis as any).TextEncoder = TextEncoder;

const mockStage: StageInfo = {
  id: 1,
  name: "Build Stage",
  state: Result.success,
  skeleton: false,
  completePercent: 100,
  children: [],
  type: "STAGE",
  title: "Build",
  pauseDurationMillis: 0,
  startTimeMillis: Date.now(),
  totalDurationMillis: 10000,
  agent: "",
  url: "",
};

const mockSteps: StepInfo[] = [
  {
    id: "step-1",
    title: "Step 1",
    stageId: "stage-1",
    state: Result.running,
    name: "",
    completePercent: 0,
    type: "",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
  },
];

describe("StageView", () => {
  it("renders StageDetails and StageSteps with provided props", async () => {
    await act(async () => {
      render(
        <StageView
          stage={mockStage}
          steps={mockSteps}
          stepBuffers={new Map()}
          expandedSteps={["step-1"]}
          handleStepToggle={vi.fn()}
          handleMoreConsoleClick={vi.fn()}
        />,
      );
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Build Stage",
    );
    expect(screen.getByText("Step 1")).toBeInTheDocument();
  });
});
