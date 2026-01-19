/** * @vitest-environment jsdom */

import { act, render, screen } from "@testing-library/react";
import { TextEncoder } from "util";
import { vi } from "vitest";

import { Result, StageInfo, StepInfo } from "./PipelineConsoleModel.tsx";
import { FilterProvider } from "./providers/filter-provider.tsx";
import StageView from "./StageView.tsx";

(globalThis as any).TextEncoder = TextEncoder;

const mockBuffer = { lines: [], startByte: 0, endByte: 0 };

const mockStage: StageInfo = {
  id: 1,
  name: "Build Stage",
  state: Result.success,
  skeleton: false,
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
        <FilterProvider>
          <StageView
            tailLogs={false}
            scrollToTail={() => {}}
            stopTailingLogs={() => {}}
            stage={mockStage}
            steps={mockSteps}
            stepBuffers={new Map()}
            expandedSteps={["step-1"]}
            onStepToggle={vi.fn()}
            fetchLogText={async () => mockBuffer}
            fetchExceptionText={async () => mockBuffer}
          />
        </FilterProvider>,
      );
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Build Stage",
    );
    expect(screen.getByText("Step 1")).toBeInTheDocument();
  });
});
