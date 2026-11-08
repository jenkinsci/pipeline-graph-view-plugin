/** * @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

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

describe("SplitView", () => {
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

      const after = screen.getByRole("button");
      expect(after).toBe(button);
      expect(after).toHaveTextContent("Clicked 1 times");
      expect(after).toHaveFocus();
      expect(screen.queryByText("Side panel") !== null).toBe(!initiallyShown);
    },
  );
});
