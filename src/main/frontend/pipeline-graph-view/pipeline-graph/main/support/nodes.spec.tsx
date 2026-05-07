import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE } from "../../../../common/i18n/index.ts";
import { defaultMessages } from "../../../../common/i18n/messages.ts";
import {
  CounterNodeInfo,
  layoutGraph,
} from "../PipelineGraphLayout.ts";
import {
  LayoutInfo,
  Result,
  StageInfo,
} from "../PipelineGraphModel.tsx";
import { Node } from "./nodes.tsx";

describe("Counter node with 50+ parallel stages", () => {
  const layout: LayoutInfo = {
    nodeSpacingH: 120,
    parallelSpacingH: 120,
    nodeRadius: 12,
    terminalRadius: 7,
    curveRadius: 12,
    connectorStrokeWidth: 3.5,
    labelOffsetV: 20,
    smallLabelOffsetV: 15,
    ypStart: 55,
  };

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

  const buildGraphWithManyStages = (stageCount: number, maxColumns: number) =>
    layoutGraph(
      Array.from({ length: stageCount }, (_, i) =>
        makeStage(i + 1, `Stage ${i + 1}`),
      ),
      layout,
      true,
      defaultMessages(DEFAULT_LOCALE),
      false,
      false,
      maxColumns,
    );

  describe("layout with 50+ stages", () => {
    it("collapses 55 stages into a counter node with correct count", () => {
      const graph = buildGraphWithManyStages(55, 5);
      const counterColumn = graph.nodeColumns.find(
        (column) => column.rows[0][0].key === "counter-node",
      );
      expect(counterColumn).toBeDefined();
      const counter = counterColumn!.rows[0][0] as CounterNodeInfo;
      expect(counter.stages.length).toBe(50);
    });

    it("collapses 100 stages into a counter node with correct count", () => {
      const graph = buildGraphWithManyStages(100, 5);
      const counterColumn = graph.nodeColumns.find(
        (column) => column.rows[0][0].key === "counter-node",
      );
      expect(counterColumn).toBeDefined();
      const counter = counterColumn!.rows[0][0] as CounterNodeInfo;
      expect(counter.stages.length).toBe(95);
    });

    it("counter node holds all stage references for 60 stages at default threshold", () => {
      const graph = buildGraphWithManyStages(60, 13);
      const counterColumn = graph.nodeColumns.find(
        (column) => column.rows[0][0].key === "counter-node",
      );
      expect(counterColumn).toBeDefined();
      const counter = counterColumn!.rows[0][0] as CounterNodeInfo;
      expect(counter.stages.length).toBe(47);
      // Each stage should retain its identity
      counter.stages.forEach((stage) => {
        expect(stage.name).toMatch(/^Stage \d+$/);
        expect(stage.url).toContain("selected-node=");
      });
    });
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
        stages: Array.from({ length: 55 }, (_, i) => makeStage(i + 1, `Stage ${i + 1}`)),
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
