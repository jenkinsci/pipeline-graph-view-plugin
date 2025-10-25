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
    const { container } = render(<StageDetails stage={null} steps={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders stage name and status color class", () => {
    render(<StageDetails stage={mockStage} steps={[]} />);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Build");
    const wrapper = heading.closest(".pgv-stage-details");
    expect(wrapper?.className).toMatch(
      "pgv-stage-details jenkins-!-success-color",
    );
  });

  it("shows running bar if stage is running", () => {
    render(
      <StageDetails
        stage={{ ...mockStage, state: Result.running }}
        steps={[]}
      />,
    );

    const runningIndicator = document.querySelector(
      ".pgv-stage-details__running",
    );
    expect(runningIndicator).toBeInTheDocument();
  });

  it("does not show pause time if pauseDurationMillis is 0", () => {
    render(
      <StageDetails
        stage={{ ...mockStage, pauseDurationMillis: 0 }}
        steps={[]}
      />,
    );

    expect(screen.queryByText("Queued")).not.toBeInTheDocument();
  });

  it("disables dropdown if stage is synthetic", () => {
    render(
      <StageDetails stage={{ ...mockStage, synthetic: true }} steps={[]} />,
    );

    expect(screen.queryByRole("button")).toBeDisabled();
  });

  it("displays total duration", () => {
    render(<StageDetails stage={{ ...mockStage }} steps={[]} />);

    expect(
      screen.queryByLabelText("Total duration")?.nextSibling,
    ).toHaveTextContent("2m");
  });

  it("does not display total duration for skeleton", () => {
    render(
      <StageDetails stage={{ ...mockStage, skeleton: true }} steps={[]} />,
    );

    expect(screen.queryByLabelText("Total duration")).not.toBeInTheDocument();
  });

  it("displays total based on first step for skeleton", () => {
    render(
      <StageDetails
        stage={{
          ...mockStage,
          startTimeMillis: Date.now() - 60_000,
          skeleton: true,
        }}
        steps={[
          {
            name: "",
            title: "",
            state: Result.success,
            id: "",
            type: "",
            stageId: "",
            pauseDurationMillis: 0,
            startTimeMillis: Date.now() - 30_000,
            totalDurationMillis: 0,
          },
        ]}
      />,
    );

    expect(
      screen.queryByLabelText("Total duration")?.nextSibling,
    ).toHaveTextContent("30s");
  });

  it("displays start from stage", () => {
    render(
      <StageDetails
        stage={{ ...mockStage, startTimeMillis: Date.now() - 60_000 }}
        steps={[]}
      />,
    );

    expect(screen.queryByText("Started 1m ago")).toBeInTheDocument();
  });

  it("does not display start for skeleton", () => {
    render(
      <StageDetails
        stage={{
          ...mockStage,
          startTimeMillis: Date.now() - 60_000,
          skeleton: true,
        }}
        steps={[]}
      />,
    );

    expect(screen.queryByText(/Started .+ ago/)).not.toBeInTheDocument();
  });

  it("displays the start of first step for skeleton", () => {
    render(
      <StageDetails
        stage={{
          ...mockStage,
          startTimeMillis: Date.now() - 60_000,
          skeleton: true,
        }}
        steps={[
          {
            name: "",
            title: "",
            state: Result.success,
            id: "",
            type: "",
            stageId: "",
            pauseDurationMillis: 0,
            startTimeMillis: Date.now() - 30_000,
            totalDurationMillis: 0,
          },
        ]}
      />,
    );

    expect(screen.queryByText("Started 30s ago")).toBeInTheDocument();
  });
});

const mockStage: StageInfo = {
  name: "Build",
  state: Result.success,
  skeleton: false,
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
