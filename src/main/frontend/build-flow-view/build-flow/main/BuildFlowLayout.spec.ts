import { describe, expect, it } from "vitest";

import {
  BuildFlowEdgeModel,
  BuildFlowNodeModel,
} from "../model/BuildFlowModel.ts";
import {
  COLUMN_GAP,
  computeFlatLayout,
  computeLayout,
  computeNodeWidth,
  formatDuration,
  formatStatus,
  NODE_HEIGHT,
  NODE_WIDTH_MAX,
  NODE_WIDTH_MIN,
  PADDING,
  ROW_GAP,
} from "./BuildFlowLayout.ts";

function makeNode(
  id: string,
  jobName: string,
  jobFullName?: string,
): BuildFlowNodeModel {
  return {
    id,
    jobName,
    jobFullName: jobFullName ?? jobName,
    buildNumber: 1,
    displayName: `${jobName} #1`,
    url: `job/${jobName}/1/`,
    status: "SUCCESS",
    isCurrentBuild: false,
  };
}

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(0)).toBe("0ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(45000)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(120000)).toBe("2m");
    expect(formatDuration(3661000)).toBe("61m 1s");
  });
});

describe("formatStatus", () => {
  it("formats IN_PROGRESS", () => {
    expect(formatStatus("IN_PROGRESS")).toBe("In Progress");
  });

  it("formats NOT_BUILT", () => {
    expect(formatStatus("NOT_BUILT")).toBe("Not Built");
  });

  it("formats other statuses to title case", () => {
    expect(formatStatus("SUCCESS")).toBe("Success");
    expect(formatStatus("FAILURE")).toBe("Failure");
    expect(formatStatus("UNSTABLE")).toBe("Unstable");
    expect(formatStatus("ABORTED")).toBe("Aborted");
  });
});

describe("computeNodeWidth", () => {
  it("returns minimum for short names", () => {
    const nodes = [makeNode("a", "A"), makeNode("b", "B")];
    expect(computeNodeWidth(nodes, false)).toBe(NODE_WIDTH_MIN);
  });

  it("grows with longer names", () => {
    const nodes = [makeNode("a", "my-very-long-service-name-here")];
    const width = computeNodeWidth(nodes, false);
    expect(width).toBeGreaterThan(NODE_WIDTH_MIN);
    expect(width).toBeLessThanOrEqual(NODE_WIDTH_MAX);
  });

  it("caps at max width", () => {
    const longName = "a".repeat(100);
    const nodes = [makeNode("a", longName)];
    expect(computeNodeWidth(nodes, false)).toBe(NODE_WIDTH_MAX);
  });

  it("uses full names when flag is set", () => {
    const nodes = [makeNode("a", "svc", "org/team/svc")];
    const shortWidth = computeNodeWidth(nodes, false);
    const fullWidth = computeNodeWidth(nodes, true);
    expect(fullWidth).toBeGreaterThanOrEqual(shortWidth);
  });
});

describe("computeLayout", () => {
  const nodeWidth = 160;

  it("returns empty for no nodes", () => {
    const result = computeLayout([], [], "LTR", nodeWidth);
    expect(result.layoutNodes).toHaveLength(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("lays out a single node", () => {
    const nodes = [makeNode("a", "A")];
    const result = computeLayout(nodes, [], "LTR", nodeWidth);
    expect(result.layoutNodes).toHaveLength(1);
    expect(result.layoutNodes[0].col).toBe(0);
    expect(result.layoutNodes[0].row).toBe(0);
    expect(result.layoutNodes[0].x).toBe(PADDING);
    expect(result.layoutNodes[0].y).toBe(PADDING);
    expect(result.width).toBe(PADDING * 2 + nodeWidth);
    expect(result.height).toBe(PADDING * 2 + NODE_HEIGHT);
  });

  it("assigns columns by longest path (linear chain)", () => {
    const nodes = [makeNode("a", "A"), makeNode("b", "B"), makeNode("c", "C")];
    const edges: BuildFlowEdgeModel[] = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    const result = computeLayout(nodes, edges, "LTR", nodeWidth);
    expect(result.layoutNodes).toHaveLength(3);

    const colA = result.layoutNodes.find((n) => n.node.id === "a")!.col;
    const colB = result.layoutNodes.find((n) => n.node.id === "b")!.col;
    const colC = result.layoutNodes.find((n) => n.node.id === "c")!.col;
    expect(colA).toBe(0);
    expect(colB).toBe(1);
    expect(colC).toBe(2);
  });

  it("places parallel nodes in the same column", () => {
    const nodes = [makeNode("a", "A"), makeNode("b", "B"), makeNode("c", "C")];
    const edges: BuildFlowEdgeModel[] = [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
    ];
    const result = computeLayout(nodes, edges, "LTR", nodeWidth);

    const colB = result.layoutNodes.find((n) => n.node.id === "b")!.col;
    const colC = result.layoutNodes.find((n) => n.node.id === "c")!.col;
    expect(colB).toBe(colC);
    expect(colB).toBe(1);
  });

  it("LTR dimensions match expected formula", () => {
    const nodes = [makeNode("a", "A"), makeNode("b", "B")];
    const edges: BuildFlowEdgeModel[] = [{ from: "a", to: "b" }];
    const result = computeLayout(nodes, edges, "LTR", nodeWidth);

    // 2 columns, 1 row
    expect(result.width).toBe(PADDING * 2 + 2 * nodeWidth + 1 * COLUMN_GAP);
    expect(result.height).toBe(PADDING * 2 + NODE_HEIGHT);
  });

  it("TTB swaps width and height axes", () => {
    const nodes = [makeNode("a", "A"), makeNode("b", "B")];
    const edges: BuildFlowEdgeModel[] = [{ from: "a", to: "b" }];
    const result = computeLayout(nodes, edges, "TTB", nodeWidth);

    // 2 levels vertically (each NODE_HEIGHT + COLUMN_GAP apart)
    expect(result.height).toBe(PADDING * 2 + 2 * NODE_HEIGHT + 1 * COLUMN_GAP);
    expect(result.width).toBe(PADDING * 2 + nodeWidth);
  });

  it("centers parallel nodes vertically in LTR", () => {
    const nodes = [
      makeNode("a", "Root"),
      makeNode("b", "Branch1"),
      makeNode("c", "Branch2"),
    ];
    const edges: BuildFlowEdgeModel[] = [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
    ];
    const result = computeLayout(nodes, edges, "LTR", nodeWidth);

    const nodeA = result.layoutNodes.find((n) => n.node.id === "a")!;
    const nodeB = result.layoutNodes.find((n) => n.node.id === "b")!;
    const nodeC = result.layoutNodes.find((n) => n.node.id === "c")!;

    // A should be centered between B and C vertically
    const midBC = (nodeB.y + nodeC.y + NODE_HEIGHT) / 2;
    const midA = nodeA.y + NODE_HEIGHT / 2;
    expect(midA).toBeCloseTo(midBC, 0);
  });
});

describe("computeFlatLayout", () => {
  const nodeWidth = 160;

  it("returns empty for no nodes", () => {
    const result = computeFlatLayout([], nodeWidth);
    expect(result.layoutNodes).toHaveLength(0);
    expect(result.width).toBe(0);
  });

  it("lays out nodes in a grid", () => {
    const nodes = [makeNode("a", "A"), makeNode("b", "B"), makeNode("c", "C")];
    const result = computeFlatLayout(nodes, nodeWidth);
    expect(result.layoutNodes).toHaveLength(3);
    // All in same row (800 / (160+16) = 4 cols fits)
    expect(result.layoutNodes[0].row).toBe(0);
    expect(result.layoutNodes[1].row).toBe(0);
    expect(result.layoutNodes[2].row).toBe(0);
  });

  it("wraps to next row when too many nodes", () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode(`n${i}`, `N${i}`),
    );
    const result = computeFlatLayout(nodes, nodeWidth);
    // cols = floor(800/(160+16)) = 4
    const lastNode = result.layoutNodes[result.layoutNodes.length - 1];
    expect(lastNode.row).toBeGreaterThan(0);
  });

  it("height increases with more rows", () => {
    const fewNodes = [makeNode("a", "A"), makeNode("b", "B")];
    const manyNodes = Array.from({ length: 20 }, (_, i) =>
      makeNode(`n${i}`, `N${i}`),
    );
    const fewResult = computeFlatLayout(fewNodes, nodeWidth);
    const manyResult = computeFlatLayout(manyNodes, nodeWidth);
    expect(manyResult.height).toBeGreaterThan(fewResult.height);
  });
});
