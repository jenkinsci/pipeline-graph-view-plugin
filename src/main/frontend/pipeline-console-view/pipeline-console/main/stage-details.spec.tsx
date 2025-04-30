/** * @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { TextEncoder } from "util";

import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import StageDetails from "./stage-details.tsx";

(globalThis as any).TextEncoder = TextEncoder;

describe("StageDetails", () => {
  it("renders null when stage is null", () => {
    const { container } = render(<StageDetails stage={null} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders stage name and status color class", () => {
    render(<StageDetails stage={mockStage} />);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Build");
    const wrapper = heading.closest(".pgv-stage-details");
    expect(wrapper?.className).toMatch(
      "pgv-stage-details jenkins-!-success-color",
    );
  });

  it("shows running bar if stage is running", () => {
    render(<StageDetails stage={{ ...mockStage, state: Result.running }} />);

    const runningIndicator = document.querySelector(
      ".pgv-stage-details__running",
    );
    expect(runningIndicator).toBeInTheDocument();
  });

  it("does not show pause time if pauseDurationMillis is 0", () => {
    render(<StageDetails stage={{ ...mockStage, pauseDurationMillis: 0 }} />);

    expect(screen.queryByText("Queued")).not.toBeInTheDocument();
  });

  it("disables dropdown if stage is synthetic", () => {
    render(<StageDetails stage={{ ...mockStage, synthetic: true }} />);

    expect(screen.queryByRole("button")).toBeDisabled();
  });
});

const mockStage: StageInfo = {
  name: "Build",
  state: Result.success,
  skeleton: false,
  completePercent: 100,
  id: 1,
  title: "Build",
  type: "STAGE",
  agent: "agent-1",
  children: [],
  pauseDurationMillis: 5000,
  startTimeMillis: 1713440000000,
  totalDurationMillis: 120000,
  url: "",
};
