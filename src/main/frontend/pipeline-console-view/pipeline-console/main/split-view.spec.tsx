/** * @vitest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SplitView from "./split-view.tsx";

vi.mock("./providers/user-preference-provider.tsx", () => ({
  useLayoutPreferences: () => ({
    setTreeViewWidth: vi.fn(),
    setStageViewWidth: vi.fn(),
    setPersistedStageViewHeight: vi.fn(),
    defaultStageViewHeight: 250,
    treeViewWidth: 300,
    stageViewWidth: 600,
    stageViewHeight: 250,
  }),
}));

function StatefulPanel() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
  );
}

function Layout({ showSidePanel }: { showSidePanel: boolean }) {
  return (
    <SplitView storageKey="stages">
      {showSidePanel && <div key="side">Side panel</div>}
      <div key="main">
        <StatefulPanel />
      </div>
    </SplitView>
  );
}

const container = () =>
  document.querySelector(".pgv-split-view__container") as HTMLElement;

describe("SplitView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the side panel and main panel side by side", () => {
    render(<Layout showSidePanel />);

    expect(screen.getByText("Side panel")).toBeInTheDocument();
    expect(
      document.querySelector(".pgv-split-view__side-panel"),
    ).toBeInTheDocument();
  });

  it.each([
    ["hiding", true],
    ["showing", false],
  ])(
    "keeps the main panel's state and focus when %s the side panel",
    (_, initiallyShown) => {
      const { rerender } = render(<Layout showSidePanel={initiallyShown} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      button.focus();

      rerender(<Layout showSidePanel={!initiallyShown} />);
      act(() => {
        vi.runAllTimers();
      });

      const after = screen.getByRole("button");
      expect(after).toBe(button);
      expect(after).toHaveTextContent("Clicked 1 times");
      expect(after).toHaveFocus();
      expect(screen.queryByText("Side panel") !== null).toBe(!initiallyShown);
    },
  );

  it("keeps the side panel while it collapses, then removes it", () => {
    const { rerender } = render(<Layout showSidePanel />);
    expect(container()).not.toHaveClass("pgv-split-view__container--collapsed");

    rerender(<Layout showSidePanel={false} />);

    expect(screen.getByText("Side panel")).toBeInTheDocument();
    expect(container()).toHaveClass("pgv-split-view__container--collapsed");
    expect(container().style.gridTemplateColumns).toBe("0px 1fr");
    expect(
      document.querySelector(".pgv-split-view__side-panel"),
    ).toHaveAttribute("inert");

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByText("Side panel")).not.toBeInTheDocument();
    expect(container().style.display).toBe("block");
  });

  it("expands the side panel from collapsed to its full size", () => {
    const { rerender } = render(<Layout showSidePanel={false} />);

    rerender(<Layout showSidePanel />);

    expect(screen.getByText("Side panel")).toBeInTheDocument();
    expect(container()).toHaveClass("pgv-split-view__container--animating");
    expect(container().style.gridTemplateColumns).toBe("300px 1fr");

    act(() => {
      vi.runAllTimers();
    });

    expect(container()).not.toHaveClass("pgv-split-view__container--animating");
  });
});
