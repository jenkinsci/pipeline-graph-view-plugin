/** * @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StagesCustomization from "./stages-customization.tsx";

const {
  mockSetMainViewVisibility,
  mockSetStageViewPosition,
  mockUseLayoutPreferences,
} = vi.hoisted(() => ({
  mockSetMainViewVisibility: vi.fn(),
  mockSetStageViewPosition: vi.fn(),
  mockUseLayoutPreferences: vi.fn(),
}));

vi.mock("../providers/user-preference-provider.tsx", () => ({
  useLayoutPreferences: mockUseLayoutPreferences.mockReturnValue({
    mainViewVisibility: "both",
    setMainViewVisibility: mockSetMainViewVisibility,
    stageViewPosition: "top",
    setStageViewPosition: mockSetStageViewPosition,
    isMobile: false,
  }),
  MainViewVisibility: {
    BOTH: "both",
    GRAPH_ONLY: "graphOnly",
    STAGES_ONLY: "stagesOnly",
  },
  StageViewPosition: {
    TOP: "top",
    LEFT: "left",
  },
}));

describe("StagesCustomization", () => {
  it("should render Views and Graph position controls", () => {
    render(<StagesCustomization />);

    expect(screen.getByText("Views")).toBeInTheDocument();
    expect(screen.getByText("Graph position")).toBeInTheDocument();
  });

  it("should show current values", () => {
    render(<StagesCustomization />);

    expect(screen.getAllByText("Graph and stages").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Top").length).toBeGreaterThan(0);
  });

  it("should change view visibility on select", () => {
    render(<StagesCustomization />);

    const viewsSelect = document.getElementById(
      "main-view-visibility",
    ) as HTMLSelectElement;
    fireEvent.change(viewsSelect, { target: { value: "graphOnly" } });
    expect(mockSetMainViewVisibility).toHaveBeenCalledWith("graphOnly");
  });

  it("should change graph position on select", () => {
    render(<StagesCustomization />);

    const positionSelect = document.getElementById(
      "stage-view-position",
    ) as HTMLSelectElement;
    fireEvent.change(positionSelect, { target: { value: "left" } });
    expect(mockSetStageViewPosition).toHaveBeenCalledWith("left");
  });

  it("should return null on mobile", () => {
    mockUseLayoutPreferences.mockReturnValueOnce({
      mainViewVisibility: "both",
      setMainViewVisibility: vi.fn(),
      stageViewPosition: "top",
      setStageViewPosition: vi.fn(),
      isMobile: true,
    });

    const { container } = render(<StagesCustomization />);
    expect(container.innerHTML).toBe("");
  });
});
