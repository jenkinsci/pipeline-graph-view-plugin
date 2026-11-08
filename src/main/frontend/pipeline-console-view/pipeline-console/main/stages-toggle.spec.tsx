/** * @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StagesToggle from "./stages-toggle.tsx";

const { mockSetMainViewVisibility, mockUseLayoutPreferences } = vi.hoisted(
  () => ({
    mockSetMainViewVisibility: vi.fn(),
    mockUseLayoutPreferences: vi.fn(),
  }),
);

vi.mock("./providers/user-preference-provider.tsx", () => ({
  useLayoutPreferences: mockUseLayoutPreferences,
  MainViewVisibility: {
    BOTH: "both",
    GRAPH_ONLY: "graphOnly",
    STAGES_ONLY: "stagesOnly",
  },
}));

const preferences = (mainViewVisibility: string, isMobile = false) => ({
  mainViewVisibility,
  setMainViewVisibility: mockSetMainViewVisibility,
  isMobile,
});

describe("StagesToggle", () => {
  it("hides the stages when the graph and stages are shown", () => {
    mockUseLayoutPreferences.mockReturnValue(preferences("both"));
    render(<StagesToggle />);

    const button = screen.getByRole("button", { name: "Hide stages" });
    fireEvent.click(button);
    expect(mockSetMainViewVisibility).toHaveBeenCalledWith("graphOnly");
  });

  it("shows the stages when only the graph is shown", () => {
    mockUseLayoutPreferences.mockReturnValue(preferences("graphOnly"));
    render(<StagesToggle />);

    const button = screen.getByRole("button", { name: "Show stages" });
    fireEvent.click(button);
    expect(mockSetMainViewVisibility).toHaveBeenCalledWith("both");
  });

  it("is not shown when only the stages are shown", () => {
    mockUseLayoutPreferences.mockReturnValue(preferences("stagesOnly"));
    const { container } = render(<StagesToggle />);
    expect(container.innerHTML).toBe("");
  });

  it("is not shown on mobile", () => {
    mockUseLayoutPreferences.mockReturnValue(preferences("graphOnly", true));
    const { container } = render(<StagesToggle />);
    expect(container.innerHTML).toBe("");
  });
});
