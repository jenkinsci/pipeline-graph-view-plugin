/** * @vitest-environment jsdom */

import { act, render, screen } from "@testing-library/react";
import { TextEncoder } from "util";
import { vi } from "vitest";

import { Result, StageInfo, StepInfo } from "./PipelineConsoleModel.tsx";
import StageView from "./StageView.tsx";

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
          onStepToggle={vi.fn()}
          onMoreConsoleClick={vi.fn()}
          fetchExceptionText={vi.fn()}
        />,
      );
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Build Stage",
    );
    expect(screen.getByText("Step 1")).toBeInTheDocument();
  });
});
