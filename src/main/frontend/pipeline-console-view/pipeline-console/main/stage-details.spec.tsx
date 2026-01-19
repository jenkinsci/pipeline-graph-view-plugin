/** * @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { TextEncoder } from "util";

import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { FilterProvider } from "./providers/filter-provider.tsx";
import StageDetails from "./stage-details.tsx";

(globalThis as any).TextEncoder = TextEncoder;

describe("StageDetails", () => {
  it("renders null when stage is null", () => {
    const { container } = render(<StageDetails stage={null} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders stage name and status color class", () => {
    render(
      <FilterProvider>
        <StageDetails stage={mockStage} />
      </FilterProvider>,
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Build");
    const wrapper = heading.closest(".pgv-stage-details");
    expect(wrapper?.className).toMatch(
      "pgv-stage-details jenkins-!-success-color",
    );
  });

  it("shows running bar if stage is running", () => {
    render(
      <FilterProvider>
        <StageDetails stage={{ ...mockStage, state: Result.running }} />
      </FilterProvider>,
    );

    const runningIndicator = document.querySelector(
      ".pgv-stage-details__running",
    );
    expect(runningIndicator).toBeInTheDocument();
  });

  it("does not show pause time if pauseDurationMillis is 0", () => {
    render(
      <FilterProvider>
        <StageDetails stage={{ ...mockStage, pauseDurationMillis: 0 }} />
      </FilterProvider>,
    );

    expect(screen.queryByText("Queued")).not.toBeInTheDocument();
  });

  it("disables dropdown if stage is synthetic", () => {
    render(
      <FilterProvider>
        <StageDetails stage={{ ...mockStage, synthetic: true }} />
      </FilterProvider>,
    );

    const dropdownButton = screen.getByRole("button", { name: "More actions" });
    expect(dropdownButton).toBeDisabled();
  });

  it("displays total duration", () => {
    render(
      <FilterProvider>
        <StageDetails stage={{ ...mockStage }} />
      </FilterProvider>,
    );

    expect(
      screen.queryByLabelText("Total duration")?.nextSibling,
    ).toHaveTextContent("2m");
  });

  it("displays start from stage", () => {
    render(
      <FilterProvider>
        <StageDetails
          stage={{ ...mockStage, startTimeMillis: Date.now() - 60_000 }}
        />
      </FilterProvider>,
    );

    expect(screen.queryByText("Started 1m ago")).toBeInTheDocument();
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
