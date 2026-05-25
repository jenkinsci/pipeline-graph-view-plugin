import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  LayoutInfo,
  NodeLabelInfo,
  Result,
  StageInfo,
} from "../PipelineGraphModel.tsx";
import { BigLabel, SequentialContainerLabel, SmallLabel } from "./labels.tsx";

const layout: LayoutInfo = {
  nodeSpacingH: 120,
  parallelSpacingH: 120,
  nodeSpacingV: 70,
  nodeRadius: 12,
  terminalRadius: 7,
  curveRadius: 12,
  connectorStrokeWidth: 3.5,
  labelOffsetV: 20,
  smallLabelOffsetV: 15,
  ypStart: 55,
};

function makeStage(overrides: Partial<StageInfo> = {}): StageInfo {
  return {
    name: "Build",
    title: "Build",
    state: Result.success,
    id: 1,
    type: "STAGE",
    children: [],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 1000,
    agent: "built-in",
    url: "/",
    ...overrides,
  };
}

function makeLabelInfo(
  stage: StageInfo,
  overrides: Partial<NodeLabelInfo> = {},
): NodeLabelInfo {
  return {
    x: 100,
    y: 50,
    key: `label-${stage.id}`,
    text: stage.name,
    stage,
    node: {
      key: `node-${stage.id}`,
      x: 100,
      y: 50,
      id: stage.id,
      name: stage.name,
      isPlaceholder: true,
      type: "start",
    },
    ...overrides,
  };
}

describe("BigLabel", () => {
  it("renders label text for leaf stage without badge", () => {
    const stage = makeStage();
    render(
      <BigLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        measuredHeight={200}
        isSelected={false}
      />,
    );
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders collapse badge when stage has parallel children", () => {
    const child1 = makeStage({ name: "Unit", id: 10 });
    const child2 = makeStage({ name: "Integration", id: 11 });
    const stage = makeStage({ children: [child1, child2] });
    render(
      <BigLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        measuredHeight={200}
        isSelected={false}
        isCollapsed={false}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByTitle("Collapse nested stages")).toBeInTheDocument();
  });

  it("shows expand title when collapsed", () => {
    const child = makeStage({ name: "Unit", id: 10 });
    const stage = makeStage({ children: [child] });
    render(
      <BigLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        measuredHeight={200}
        isSelected={false}
        isCollapsed
      />,
    );
    expect(screen.getByTitle("Expand nested stages")).toBeInTheDocument();
  });

  it("fires onToggleCollapse with stage id on badge click", () => {
    const toggle = vi.fn();
    const child = makeStage({ name: "Unit", id: 10 });
    const stage = makeStage({ children: [child] });
    render(
      <BigLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        measuredHeight={200}
        isSelected={false}
        isCollapsed={false}
        onToggleCollapse={toggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(toggle).toHaveBeenCalledWith(1);
  });

  it("shows collapsedChildCount for a collapsed stage without children array", () => {
    const stage = makeStage({ collapsedChildCount: 5 });
    render(
      <BigLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        measuredHeight={200}
        isSelected={false}
        isCollapsed
      />,
    );
    expect(screen.getByText("(5)")).toBeInTheDocument();
  });
});

describe("SmallLabel", () => {
  it("renders label text without badge for leaf stage", () => {
    const stage = makeStage();
    render(
      <SmallLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isSelected={false}
      />,
    );
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders badge when collapsedChildCount > 0", () => {
    const stage = makeStage({ collapsedChildCount: 3 });
    render(
      <SmallLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isSelected={false}
        isCollapsed
      />,
    );
    expect(screen.getByText("(3)")).toBeInTheDocument();
    expect(screen.getByTitle("Expand nested stages")).toBeInTheDocument();
  });

  it("fires onToggleCollapse on badge click", () => {
    const toggle = vi.fn();
    const stage = makeStage({ collapsedChildCount: 3 });
    render(
      <SmallLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isSelected={false}
        isCollapsed
        onToggleCollapse={toggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(toggle).toHaveBeenCalledWith(1);
  });
});

describe("SequentialContainerLabel", () => {
  it("renders label text without badge for leaf stage", () => {
    const stage = makeStage();
    render(
      <SequentialContainerLabel
        details={makeLabelInfo(stage)}
        layout={layout}
      />,
    );
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders badge when stage has children", () => {
    const child1 = makeStage({ name: "Step A", id: 20 });
    const child2 = makeStage({ name: "Step B", id: 21 });
    const stage = makeStage({ children: [child1, child2] });
    render(
      <SequentialContainerLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isCollapsed={false}
      />,
    );
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByTitle("Collapse nested stages")).toBeInTheDocument();
  });

  it("shows expand title when collapsed", () => {
    const child = makeStage({ name: "Step A", id: 20 });
    const stage = makeStage({ children: [child] });
    render(
      <SequentialContainerLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isCollapsed
      />,
    );
    expect(screen.getByTitle("Expand nested stages")).toBeInTheDocument();
  });

  it("fires onToggleCollapse on badge click", () => {
    const toggle = vi.fn();
    const child = makeStage({ name: "Step A", id: 20 });
    const stage = makeStage({ children: [child] });
    render(
      <SequentialContainerLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isCollapsed={false}
        onToggleCollapse={toggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(toggle).toHaveBeenCalledWith(1);
  });

  it("shows collapsedChildCount for already-collapsed stage", () => {
    const stage = makeStage({ collapsedChildCount: 4 });
    render(
      <SequentialContainerLabel
        details={makeLabelInfo(stage)}
        layout={layout}
        isCollapsed
      />,
    );
    expect(screen.getByText("(4)")).toBeInTheDocument();
  });
});
