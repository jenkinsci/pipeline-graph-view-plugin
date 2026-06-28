/** * @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import {
  ConsoleSection,
  ConsoleSectionNodeRenderer,
} from "./ConsoleSection.tsx";
import type {
  ConsoleSectionGroup,
  ConsoleSectionLine,
} from "./parseConsoleSections.ts";

describe("ConsoleSectionNodeRenderer", () => {
  const baseProps = {
    stepId: "5",
    startByte: 0,
    stopTailingLogs: vi.fn(),
    currentRunPath: "/jenkins/job/test/1/",
  };

  it("renders a line node as ConsoleLine", () => {
    const node: ConsoleSectionLine = {
      kind: "line",
      index: 0,
      content: "Hello, world!",
    };
    const { container } = render(
      <ConsoleSectionNodeRenderer node={node} {...baseProps} />,
    );
    expect(container.querySelector(".console-output-line")).toBeTruthy();
    expect(container.textContent).toContain("Hello, world!");
  });

  it("renders a group node as details/summary", () => {
    const node: ConsoleSectionGroup = {
      kind: "group",
      title: "Build",
      startIndex: 0,
      endIndex: 3,
      children: [
        { kind: "line", index: 1, content: "compiling..." },
        { kind: "line", index: 2, content: "done" },
      ],
    };
    const { container } = render(
      <ConsoleSectionNodeRenderer node={node} {...baseProps} />,
    );
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(
      container.querySelector(".pgv-console-section__title")?.textContent,
    ).toBe("Build");
    expect(
      container.querySelector(".pgv-console-section__count")?.textContent,
    ).toContain("2 lines");
  });
});

describe("ConsoleSection", () => {
  const baseProps = {
    stepId: "5",
    startByte: 0,
    stopTailingLogs: vi.fn(),
    currentRunPath: "/jenkins/job/test/1/",
  };

  it("renders open by default for a small closed group", () => {
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Install",
      startIndex: 0,
      endIndex: 5,
      children: [{ kind: "line", index: 1, content: "npm ci" }],
    };
    const { container } = render(
      <ConsoleSection group={group} {...baseProps} />,
    );
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(details!.open).toBe(true);
  });

  it("renders closed by default when children exceed 25", () => {
    const children = Array.from({ length: 30 }, (_, i) => ({
      kind: "line" as const,
      index: i + 1,
      content: `line ${i + 1}`,
    }));
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Big Section",
      startIndex: 0,
      endIndex: 31,
      children,
    };
    const { container } = render(
      <ConsoleSection group={group} {...baseProps} />,
    );
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(details!.open).toBe(false);
  });

  it("renders open by default for an unclosed group (still streaming)", () => {
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Running",
      startIndex: 0,
      endIndex: -1,
      children: [{ kind: "line", index: 1, content: "in progress..." }],
    };
    const { container } = render(
      <ConsoleSection group={group} {...baseProps} />,
    );
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(details!.open).toBe(true);
  });

  it("displays title and line count", () => {
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Test Suite",
      startIndex: 0,
      endIndex: 4,
      children: [
        { kind: "line", index: 1, content: "test 1" },
        { kind: "line", index: 2, content: "test 2" },
        { kind: "line", index: 3, content: "test 3" },
      ],
    };
    render(<ConsoleSection group={group} {...baseProps} />);
    expect(screen.getByText("Test Suite")).toBeTruthy();
    expect(screen.getByText(/3 lines/)).toBeTruthy();
  });

  it("shows singular 'line' for single child", () => {
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Single",
      startIndex: 0,
      endIndex: 2,
      children: [{ kind: "line", index: 1, content: "only" }],
    };
    render(<ConsoleSection group={group} {...baseProps} />);
    expect(screen.getByText(/1 line$/)).toBeTruthy();
  });

  it("toggles open/closed on click", async () => {
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Toggle Me",
      startIndex: 0,
      endIndex: 3,
      children: [{ kind: "line", index: 1, content: "inside" }],
    };
    const { container } = render(
      <ConsoleSection group={group} {...baseProps} />,
    );
    const summary = container.querySelector("summary")!;
    const details = container.querySelector("details")!;
    // Small group defaults to open
    expect(details.open).toBe(true);

    fireEvent.click(summary);
    expect(details.open).toBe(false);

    fireEvent.click(summary);
    expect(details.open).toBe(true);
  });

  it("hides content when collapsed and restores on re-expand", () => {
    const group: ConsoleSectionGroup = {
      kind: "group",
      title: "Collapsible Group",
      startIndex: 0,
      endIndex: 4,
      children: [
        { kind: "line", index: 1, content: "line alpha" },
        { kind: "line", index: 2, content: "line beta" },
        { kind: "line", index: 3, content: "line gamma" },
      ],
    };
    const { container } = render(
      <ConsoleSection group={group} {...baseProps} />,
    );
    const summary = container.querySelector("summary")!;
    const details = container.querySelector("details")!;
    const body = container.querySelector(".pgv-console-section__body")!;

    // Section shows up in the UI with title and content visible
    expect(screen.getByText("Collapsible Group")).toBeTruthy();
    expect(details.open).toBe(true);
    expect(body.textContent).toContain("line alpha");
    expect(body.textContent).toContain("line beta");
    expect(body.textContent).toContain("line gamma");

    // Clicking collapses the section - content is not present
    fireEvent.click(summary);
    expect(details.open).toBe(false);
    expect(container.querySelector(".pgv-console-section__body")).toBeFalsy();

    // Clicking again restores the group
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    const restoredBody = container.querySelector(".pgv-console-section__body")!;
    expect(restoredBody.textContent).toContain("line alpha");
    expect(restoredBody.textContent).toContain("line beta");
    expect(restoredBody.textContent).toContain("line gamma");
  });
});
