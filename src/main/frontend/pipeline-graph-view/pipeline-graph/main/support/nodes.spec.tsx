import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CounterNodeInfo, Result, StageInfo } from "../PipelineGraphModel.tsx";
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

      render(<Node node={counterNode} isSelected={false} />);
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

      render(<Node node={counterNode} isSelected={false} />);

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

      render(<Node node={counterNode} isSelected={false} />);

      const counterBadge = screen.getByText(String(stageCount));
      fireEvent.mouseEnter(counterBadge.closest(".PWGx-pipeline-node")!);

      const tooltipList = document.querySelector(".pgv-node__counter-tooltip");
      expect(tooltipList).not.toBeNull();
      expect(tooltipList!.querySelectorAll("li").length).toBe(stageCount);
    });
  });
});
