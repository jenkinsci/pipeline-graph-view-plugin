/** * @vitest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import DataTreeView from "./DataTreeView.tsx";
import { FilterProvider } from "./providers/filter-provider.tsx";

const ITEM_HEIGHT = 40;
const SIDEBAR_HEIGHT = 200;
const FILTER_BAR_HEIGHT = 40;
let sidebarTop = 0;
let sidebarHeight = SIDEBAR_HEIGHT;

function stage(id: number, children: StageInfo[] = []): StageInfo {
  return {
    name: `Stage ${id}`,
    title: `Stage ${id}`,
    state: Result.success,
    id,
    type: "STAGE",
    children,
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 1000,
    agent: "built-in",
    url: "",
  };
}

const manyStages = Array.from({ length: 50 }, (_, i) => stage(i + 1));
const withNestedLast = [
  ...manyStages,
  stage(100, [stage(101), stage(102, [stage(103)])]),
];

/** Scroll position that centres the item at `index` below the filter bar. */
function centred(index: number, height = SIDEBAR_HEIGHT) {
  return index * ITEM_HEIGHT - (height - FILTER_BAR_HEIGHT - ITEM_HEIGHT) / 2;
}

function renderTree(stages: StageInfo[], selected: number) {
  const ui = (selectedId: number) => (
    <FilterProvider>
      <div data-testid="sidebar" style={{ overflowY: "auto" }}>
        <DataTreeView
          stages={stages}
          selected={selectedId}
          onNodeSelect={() => {}}
          currentRunPath="/job/p/1/"
        />
      </div>
    </FilterProvider>
  );
  const result = render(ui(selected));
  return {
    sidebar: screen.getByTestId("sidebar"),
    select: (id: number) => result.rerender(ui(id)),
  };
}

describe("DataTreeView", () => {
  beforeEach(() => {
    // jsdom has no layout, so give the sidebar a fixed height with the sticky
    // filter bar at its top, and lay tree items out in a column below the bar,
    // offset by the sidebar's scroll position (clamped to how far its content
    // can scroll, which jsdom does not do).
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const sidebar = this.closest<HTMLElement>("[data-testid=sidebar]");
        if (this === sidebar) {
          return new DOMRect(0, sidebarTop, 300, sidebarHeight);
        }
        if (sidebar && this.classList.contains("pgw-filter-bar")) {
          return new DOMRect(0, sidebarTop, 300, FILTER_BAR_HEIGHT);
        }
        if (sidebar && this.classList.contains("pgv-tree-item-container")) {
          const items = [
            ...sidebar.querySelectorAll(".pgv-tree-item-container"),
          ];
          const maxScroll = Math.max(
            FILTER_BAR_HEIGHT + items.length * ITEM_HEIGHT - sidebarHeight,
            0,
          );
          const top =
            sidebarTop +
            FILTER_BAR_HEIGHT +
            items.indexOf(this) * ITEM_HEIGHT -
            Math.min(sidebar.scrollTop, maxScroll);
          return new DOMRect(0, top, 300, ITEM_HEIGHT);
        }
        return new DOMRect();
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.testid === "sidebar" ? sidebarHeight : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        if (this.dataset.testid !== "sidebar") return 0;
        const items = this.querySelectorAll(".pgv-tree-item-container");
        return Math.max(
          FILTER_BAR_HEIGHT + items.length * ITEM_HEIGHT,
          sidebarHeight,
        );
      },
    );
  });

  afterEach(() => {
    // jsdom does not implement these, so they are stubbed per test.
    delete (Element.prototype as Partial<Element>).scrollIntoView;
    delete (globalThis as Partial<typeof globalThis>).ResizeObserver;
    sidebarTop = 0;
    sidebarHeight = SIDEBAR_HEIGHT;
    vi.restoreAllMocks();
  });

  it("scrolls the sidebar to centre a selected stage that starts out of view", () => {
    const { sidebar } = renderTree(manyStages, 40);

    // Stage 40 is item 39.
    expect(sidebar.scrollTop).toBe(centred(39));
  });

  it("expands parents and scrolls to a selected nested stage", () => {
    const { sidebar } = renderTree(withNestedLast, 103);

    expect(
      screen.getByRole("treeitem", { name: /Stage 103$/ }),
    ).toHaveAttribute("aria-selected", "true");
    // Items 0-49 are top-level stages, then 100, 101, 102 and 103.
    expect(sidebar.scrollTop).toBe(centred(53));
  });

  it("scrolls when the selection changes to a stage out of view", () => {
    const { sidebar, select } = renderTree(manyStages, 1);
    expect(sidebar.scrollTop).toBe(0);

    select(30);

    expect(sidebar.scrollTop).toBe(centred(29));
  });

  it("does not scroll when the selected stage is already visible", () => {
    const { sidebar, select } = renderTree(manyStages, 2);
    expect(sidebar.scrollTop).toBe(0);

    select(4);

    expect(sidebar.scrollTop).toBe(0);
  });

  it("scrolls to a selected stage hidden under the search bar", () => {
    const { sidebar, select } = renderTree(manyStages, 1);
    // Stage 11 is just below the search bar, so stage 10 is under it.
    sidebar.scrollTop = 10 * ITEM_HEIGHT;

    select(10);

    expect(sidebar.scrollTop).toBe(centred(9));
  });

  it("centres within the on-screen part of a sidebar that extends below the fold", () => {
    // Before the page is scrolled the sticky sidebar starts below the graph.
    sidebarTop = window.innerHeight - 200;
    sidebarHeight = 600;
    const { sidebar } = renderTree(manyStages, 40);

    expect(sidebar.scrollTop).toBe(centred(39));
  });

  it("centres within the whole sidebar when hardly any of it is on screen", () => {
    sidebarTop = window.innerHeight - 10;
    sidebarHeight = 600;
    const { sidebar } = renderTree(manyStages, 40);

    expect(sidebar.scrollTop).toBe(centred(39, 600));
  });

  it("does not scroll a sidebar whose stages all fit", () => {
    // Pushed below the fold, but there is nothing to scroll.
    sidebarTop = window.innerHeight;
    const { sidebar } = renderTree(manyStages.slice(0, 3), 3);

    expect(sidebar.scrollTop).toBe(0);
  });

  it("shows the selected stage again once a search is cleared", () => {
    const { sidebar } = renderTree(manyStages, 40);
    const search = screen.getByRole("searchbox");

    fireEvent.change(search, { target: { value: "Stage 40" } });
    // The browser clamps the scroll position once the list is that short.
    sidebar.scrollTop = 0;
    fireEvent.change(search, { target: { value: "" } });

    expect(sidebar.scrollTop).toBe(centred(39));
  });

  it("shows the selected stage below a group that a search expands", () => {
    const group = stage(200, [
      stage(201),
      stage(202),
      stage(203),
      stage(204),
      stage(205),
    ]);
    const { sidebar } = renderTree([group, ...manyStages], 25);
    sidebar.scrollTop = 0;

    // Shows the group, expanded, then Stage 2 and Stages 20-29.
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Stage 2" },
    });

    expect(
      screen.getByRole("treeitem", { name: /Stage 200$/ }),
    ).toHaveAttribute("aria-expanded", "true");
    // Items 0-5 are the group and its stages, then 2, 20, ..., 25.
    expect(sidebar.scrollTop).toBe(centred(12));
  });

  it("waits until the sidebar has room before showing the selected stage", () => {
    const callbacks: (() => void)[] = [];
    // jsdom has no ResizeObserver, so one is stubbed per test.
    globalThis.ResizeObserver = class {
      private connected = true;
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(() => this.connected && callback([], this));
      }
      observe() {}
      unobserve() {}
      disconnect() {
        this.connected = false;
      }
    };
    // The graph pushes the sidebar so far down it has no height yet.
    sidebarTop = window.innerHeight;
    sidebarHeight = 0;
    const { sidebar } = renderTree(manyStages, 40);
    expect(sidebar.scrollTop).toBe(0);

    sidebarTop = 0;
    sidebarHeight = SIDEBAR_HEIGHT;
    act(() => callbacks.forEach((callback) => callback()));

    expect(sidebar.scrollTop).toBe(centred(39));

    // Once shown, later resizes leave the user's scrolling alone.
    sidebar.scrollTop = 0;
    act(() => callbacks.forEach((callback) => callback()));
    expect(sidebar.scrollTop).toBe(0);
  });

  it("does not scroll the page itself", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    sidebarTop = window.innerHeight - 200;
    sidebarHeight = 600;

    renderTree(manyStages, 50);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
