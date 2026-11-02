/** * @vitest-environment jsdom */

import { fireEvent, render } from "@testing-library/react";

import {
  ConsoleSection,
  ConsoleSectionNodeRenderer,
} from "./ConsoleSection.tsx";
import type {
  ConsoleSectionGroup,
  ConsoleSectionLine,
} from "./parseConsoleSections.ts";

const baseProps = {
  stepId: "5",
  startByte: 0,
  stopTailingLogs: vi.fn(),
  currentRunPath: "/jenkins/job/test/1/",
};

function group(
  overrides: Partial<ConsoleSectionGroup> = {},
): ConsoleSectionGroup {
  const children: ConsoleSectionLine[] = [
    { kind: "line", index: 1, content: "compiling..." },
    { kind: "line", index: 2, content: "done" },
  ];
  return {
    kind: "group",
    title: "Build",
    startIndex: 0,
    endIndex: 3,
    lineCount: children.length,
    children,
    ...overrides,
  };
}

function manyLines(n: number): ConsoleSectionLine[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: "line" as const,
    index: i + 1,
    content: `line ${i}`,
  }));
}

describe("ConsoleSectionNodeRenderer", () => {
  it("renders a line node as ConsoleLine", () => {
    const { container } = render(
      <ConsoleSectionNodeRenderer
        node={{ kind: "line", index: 0, content: "Hello, world!" }}
        {...baseProps}
      />,
    );
    expect(container.querySelector(".console-output-line")).toBeTruthy();
    expect(container.textContent).toContain("Hello, world!");
  });

  it("renders a group node as details/summary", () => {
    const { container } = render(
      <ConsoleSectionNodeRenderer node={group()} {...baseProps} />,
    );
    expect(container.querySelector("details")).toBeTruthy();
    expect(
      container.querySelector(".pgv-console-section__title")?.textContent,
    ).toBe("Build");
    expect(
      container.querySelector(".pgv-console-section__count")?.textContent,
    ).toBe("2 lines");
  });
});

describe("ConsoleSection", () => {
  it("starts open for a small closed group", () => {
    const { container } = render(
      <ConsoleSection group={group()} {...baseProps} />,
    );
    expect(container.querySelector("details")!.open).toBe(true);
  });

  it("starts collapsed for a closed group over 25 lines, counting nested lines", () => {
    const inner = group({
      startIndex: 1,
      endIndex: 30,
      lineCount: 28,
      children: manyLines(28),
    });
    const { container } = render(
      <ConsoleSection
        group={group({ endIndex: 31, lineCount: 28, children: [inner] })}
        {...baseProps}
      />,
    );
    const outer = container.querySelector("details")!;
    expect(outer.open).toBe(false);
    expect(
      outer.querySelector(".pgv-console-section__count")?.textContent,
    ).toBe("28 lines");
  });

  it("keeps the lines of a collapsed group in the DOM", () => {
    const { container } = render(
      <ConsoleSection
        group={group({ lineCount: 30, children: manyLines(30) })}
        {...baseProps}
      />,
    );
    expect(container.querySelector("details")!.open).toBe(false);
    expect(container.querySelector("#log-5-30")).toBeTruthy();
  });

  it("starts open for an unclosed group", () => {
    const { container } = render(
      <ConsoleSection
        group={group({ endIndex: -1, lineCount: 30, children: manyLines(30) })}
        {...baseProps}
      />,
    );
    expect(container.querySelector("details")!.open).toBe(true);
  });

  it("uses a singular label for one line", () => {
    const { container } = render(
      <ConsoleSection
        group={group({ lineCount: 1, children: manyLines(1) })}
        {...baseProps}
      />,
    );
    expect(
      container.querySelector(".pgv-console-section__count")?.textContent,
    ).toBe("1 line");
  });

  it("falls back to a default title", () => {
    const { container } = render(
      <ConsoleSection group={group({ title: "" })} {...baseProps} />,
    );
    expect(
      container.querySelector(".pgv-console-section__title")?.textContent,
    ).toBe("Section");
  });

  it("renders title colours from AnsiColor markup", () => {
    const { container } = render(
      <ConsoleSection
        group={group({
          title: '<span style="color: #00CD00;">Dependencies</span>',
        })}
        {...baseProps}
      />,
    );
    const span = container.querySelector(".pgv-console-section__title span");
    expect(span?.getAttribute("style")).toContain("color");
    expect(span?.textContent).toBe("Dependencies");
  });

  it("sanitizes the title", () => {
    const { container } = render(
      <ConsoleSection
        group={group({ title: 'Build <img src=x onerror="alert(1)">' })}
        {...baseProps}
      />,
    );
    const title = container.querySelector(".pgv-console-section__title")!;
    expect(title.querySelector("img")).toBeNull();
    expect(title.textContent).toBe("Build ");
  });

  it("leaves the open state to the browser after the first render", () => {
    const { container, rerender } = render(
      <ConsoleSection group={group()} {...baseProps} />,
    );
    const details = container.querySelector("details")!;
    details.open = false;

    rerender(
      <ConsoleSection
        group={group({ children: manyLines(3), lineCount: 3 })}
        {...baseProps}
      />,
    );
    expect(details.open).toBe(false);
  });

  it("collapses a long section when it finishes while tailing", () => {
    const streaming = group({
      endIndex: -1,
      lineCount: 30,
      children: manyLines(30),
    });
    const { container, rerender } = render(
      <ConsoleSection group={streaming} {...baseProps} />,
    );
    const details = container.querySelector("details")!;
    expect(details.open).toBe(true);

    rerender(
      <ConsoleSection group={{ ...streaming, endIndex: 31 }} {...baseProps} />,
    );
    expect(details.open).toBe(false);
  });

  it("stays open when the user toggled it before it finished", () => {
    const streaming = group({
      endIndex: -1,
      lineCount: 30,
      children: manyLines(30),
    });
    const { container, rerender } = render(
      <ConsoleSection group={streaming} {...baseProps} />,
    );
    const details = container.querySelector("details")!;
    fireEvent.click(details.querySelector("summary")!);
    details.open = true;

    rerender(
      <ConsoleSection group={{ ...streaming, endIndex: 31 }} {...baseProps} />,
    );
    expect(details.open).toBe(true);
  });

  it("stays open when it holds the deep-linked line", () => {
    window.location.hash = "#log-5-10";
    try {
      const streaming = group({
        endIndex: -1,
        lineCount: 30,
        children: manyLines(30),
      });
      const { container, rerender } = render(
        <ConsoleSection group={streaming} {...baseProps} />,
      );
      rerender(
        <ConsoleSection
          group={{ ...streaming, endIndex: 31 }}
          {...baseProps}
        />,
      );
      expect(container.querySelector("details")!.open).toBe(true);
    } finally {
      window.location.hash = "";
    }
  });
});
