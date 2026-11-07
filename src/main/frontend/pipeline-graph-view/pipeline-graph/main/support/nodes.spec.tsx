import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CounterNodeInfo,
  Result,
  StageInfo,
  StageNodeInfo,
} from "../PipelineGraphModel.tsx";
import { Node } from "./nodes.tsx";

describe("Counter node with 50+ parallel stages", () => {
  const baseStage: StageInfo = {
    name: "",
    title: "",
    state: Result.success,
    id: 0,
    type: "STAGE",
    children: [],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 17000,
    agent: "built-in",
    url: "/?selected-node=0",
  };

  const makeStage = (id: number, name: string): StageInfo => ({
    ...baseStage,
    id,
    name,
    url: `/?selected-node=${id}`,
  });

  describe("counter node tooltip rendering", () => {
    it("renders counter node showing stage count", () => {
      const counterNode: CounterNodeInfo = {
        x: 100,
        y: 50,
        name: "Counter",
        id: -2,
        isPlaceholder: true,
        key: "counter-node",
        type: "counter",
        stages: Array.from({ length: 55 }, (_, i) =>
          makeStage(i + 1, `Stage ${i + 1}`),
        ),
      };

      render(<Node node={counterNode} isSelected={false} currentRunPath="/" />);
      expect(screen.getByText("55")).toBeInTheDocument();
    });

    it("renders tooltip with all 55 stages as links", () => {
      const stageCount = 55;
      const counterNode: CounterNodeInfo = {
        x: 100,
        y: 50,
        name: "Counter",
        id: -2,
        isPlaceholder: true,
        key: "counter-node",
        type: "counter",
        stages: Array.from({ length: stageCount }, (_, i) =>
          makeStage(i + 1, `Check service-${i + 1}`),
        ),
      };

      render(<Node node={counterNode} isSelected={false} currentRunPath="/" />);

      // Trigger tooltip by hovering (mouseenter)
      const counterBadge = screen.getByText(String(stageCount));
      fireEvent.mouseEnter(counterBadge.closest(".PWGx-pipeline-node")!);

      // The tooltip list should be present with all items
      const tooltipList = document.querySelector(".pgv-node__counter-tooltip");
      expect(tooltipList).not.toBeNull();
      const items = tooltipList!.querySelectorAll("li");
      expect(items.length).toBe(stageCount);

      // Each item should be a link with the stage name
      const links = tooltipList!.querySelectorAll("a");
      expect(links.length).toBe(stageCount);
      expect(links[0].textContent).toContain("Check service-1");
      expect(links[stageCount - 1].textContent).toContain(
        `Check service-${stageCount}`,
      );
    });

    it("renders tooltip with 100 stages without dropping any", () => {
      const stageCount = 100;
      const counterNode: CounterNodeInfo = {
        x: 100,
        y: 50,
        name: "Counter",
        id: -2,
        isPlaceholder: true,
        key: "counter-node",
        type: "counter",
        stages: Array.from({ length: stageCount }, (_, i) =>
          makeStage(i + 1, `Stage ${i + 1}`),
        ),
      };

      render(<Node node={counterNode} isSelected={false} currentRunPath="/" />);

      const counterBadge = screen.getByText(String(stageCount));
      fireEvent.mouseEnter(counterBadge.closest(".PWGx-pipeline-node")!);

      const tooltipList = document.querySelector(".pgv-node__counter-tooltip");
      expect(tooltipList).not.toBeNull();
      expect(tooltipList!.querySelectorAll("li").length).toBe(stageCount);
    });
  });
});

describe("Stage node waiting for input", () => {
  const fetchMock = vi.fn();

  const stageNode = (stage: Partial<StageInfo>): StageNodeInfo => ({
    x: 100,
    y: 50,
    name: "Deploy",
    id: 7,
    isPlaceholder: false,
    key: "stage-7",
    type: "stage",
    stage: {
      name: "Deploy",
      title: "Deploy",
      state: Result.paused,
      id: 7,
      type: "STAGE",
      children: [],
      pauseDurationMillis: 0,
      startTimeMillis: 0,
      agent: "built-in",
      url: "/job/example/1/stages/?selected-node=7",
      ...stage,
    },
  });

  const inputStep = {
    message: "Deploy to production?",
    ok: "Deploy",
    cancel: "Abort",
    id: "Approve",
    parameters: false,
  };

  const hover = () =>
    fireEvent.mouseEnter(document.querySelector(".PWGx-pipeline-node")!);

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.crumb = {
      wrap: vi.fn().mockReturnValue({ "Jenkins-Crumb": "crumb" }),
    };
  });

  it("proceeds with the input from the tooltip", async () => {
    render(
      <Node
        node={stageNode({ inputStep })}
        isSelected={false}
        currentRunPath="/jenkins/job/example/1/"
      />,
    );
    hover();

    expect(screen.getByText("Deploy to production?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/jenkins/job/example/1/input/Approve/proceedEmpty",
      { method: "POST", headers: { "Jenkins-Crumb": "crumb" } },
    );
    await waitFor(() =>
      expect(
        screen.getByText("Deploy to production?").closest(".tippy-box"),
      ).toHaveAttribute("data-state", "hidden"),
    );
  });

  it("aborts the input from the tooltip", () => {
    render(
      <Node
        node={stageNode({ inputStep })}
        isSelected={false}
        currentRunPath="/jenkins/job/example/1/"
      />,
    );
    hover();

    fireEvent.click(screen.getByRole("button", { name: "Abort" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/jenkins/job/example/1/input/Approve/abort",
      { method: "POST", headers: { "Jenkins-Crumb": "crumb" } },
    );
  });

  it("does not offer input controls once the stage is no longer paused", () => {
    render(
      <Node
        node={stageNode({ inputStep, state: Result.running })}
        isSelected={false}
        currentRunPath="/jenkins/job/example/1/"
      />,
    );
    hover();

    expect(screen.queryByRole("button", { name: "Deploy" })).toBeNull();
  });
});
