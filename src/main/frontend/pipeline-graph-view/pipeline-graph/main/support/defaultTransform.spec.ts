import { DEFAULT_LOCALE } from "../../../../common/i18n/index.ts";
import { defaultMessages } from "../../../../common/i18n/messages.ts";
import { nestedGraphLayout } from "../NestedPipelineGraphLayout.ts";
import {
  defaultLayout,
  NodeInfo,
  Result,
  StageInfo,
} from "../PipelineGraphModel.tsx";
import {
  computeDefaultTransform,
  findFocusX,
  MIN_READABLE_SCALE,
} from "./defaultTransform.ts";

const VIEWPORT_WIDTH = 1100;
const VIEWPORT_HEIGHT = 400;

let nextId = 1;
function stage(
  name: string,
  state: Result = Result.success,
  children: StageInfo[] = [],
  type: StageInfo["type"] = "STAGE",
): StageInfo {
  return {
    name,
    state,
    id: nextId++,
    type,
    children,
  } as unknown as StageInfo;
}

function parallel(name: string, branches: string[]): StageInfo {
  return stage(
    name,
    Result.success,
    branches.map((b) => stage(b, Result.success, [], "PARALLEL")),
  );
}

// 17 top-level stages, two of them with parallel branches (24 leaves).
function widePipeline(states: Record<string, Result> = {}): StageInfo[] {
  const stages = [
    stage("Install"),
    parallel("Static", ["Format", "Lint", "Typecheck", "Hadolint", "Shell"]),
    stage("Unit"),
    stage("E2E"),
    parallel("Quality", ["Sonar", "Audit", "Deprecated", "Trivy"]),
    ...[
      "Image",
      "Scan image",
      "SBOM",
      "Cloudflare",
      "Platform",
      "Push",
      "Sign and attest",
      "Publish SBOM",
      "Promote",
      "Wait",
      "Edge",
      "Smoke",
    ].map((name) => stage(name)),
  ];
  const apply = (list: StageInfo[]) => {
    for (const s of list) {
      if (states[s.name]) s.state = states[s.name];
      apply(s.children);
    }
  };
  apply(stages);
  return stages;
}

function layout(stages: StageInfo[]) {
  return nestedGraphLayout(
    "job/name/1/",
    stages,
    defaultLayout,
    false,
    defaultMessages(DEFAULT_LOCALE),
    true,
    false,
  );
}

function nodeX(nodes: NodeInfo[], name: string): number {
  const node = nodes.find((n) => !n.isPlaceholder && n.stage.name === name);
  if (!node) throw new Error(`No node named ${name}`);
  return node.x;
}

function transformFor(stages: StageInfo[]) {
  const graph = layout(stages);
  return {
    graph,
    transform: computeDefaultTransform(
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT,
      graph.measuredWidth,
      graph.measuredHeight,
      findFocusX(graph.nodes),
    ),
  };
}

function screenX(
  x: number,
  transform: ReturnType<typeof computeDefaultTransform>,
) {
  return x * transform.scale + transform.positionX;
}

describe("computeDefaultTransform", () => {
  it("does not shrink a wide graph below the readable scale", () => {
    const { graph, transform } = transformFor(widePipeline());
    // Precondition: fitting this graph would need a much smaller scale.
    expect(VIEWPORT_WIDTH / graph.measuredWidth).toBeLessThan(0.5);

    expect(transform.scale).toBe(MIN_READABLE_SCALE);
    expect(transform.initialScale).toBeCloseTo(
      VIEWPORT_WIDTH / graph.measuredWidth,
    );
    // Users can still zoom out far enough to see the whole graph.
    expect(transform.minScale).toBeLessThan(transform.initialScale);
  });

  it("pans the running stage into view", () => {
    const { graph, transform } = transformFor(
      widePipeline({ Promote: Result.running }),
    );
    const x = screenX(nodeX(graph.nodes, "Promote"), transform);

    expect(transform.scale).toBeGreaterThanOrEqual(MIN_READABLE_SCALE);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(VIEWPORT_WIDTH);
  });

  it("centers the running stage when the graph extends on both sides", () => {
    const { graph, transform } = transformFor(
      widePipeline({ Cloudflare: Result.running }),
    );
    const x = screenX(nodeX(graph.nodes, "Cloudflare"), transform);

    expect(x).toBeCloseTo(VIEWPORT_WIDTH / 2);
  });

  it("pans a failed stage into view when nothing is running", () => {
    const { graph, transform } = transformFor(
      widePipeline({ Platform: Result.failure }),
    );
    const x = screenX(nodeX(graph.nodes, "Platform"), transform);

    expect(x).toBeCloseTo(VIEWPORT_WIDTH / 2);
  });

  it("does not pan past the start of the graph", () => {
    const { transform } = transformFor(
      widePipeline({ Install: Result.running }),
    );

    expect(transform.positionX).toBe(0);
  });

  it("does not pan past the end of the graph", () => {
    const { graph, transform } = transformFor(
      widePipeline({ Smoke: Result.running }),
    );

    expect(transform.positionX).toBeCloseTo(
      VIEWPORT_WIDTH - graph.measuredWidth * transform.scale,
    );
    expect(screenX(nodeX(graph.nodes, "Smoke"), transform)).toBeLessThan(
      VIEWPORT_WIDTH,
    );
  });

  it("shows the start of a finished wide graph", () => {
    const { transform } = transformFor(widePipeline());

    expect(transform.positionX).toBe(0);
  });

  it("keeps a graph that fits unchanged", () => {
    const { graph, transform } = transformFor([
      stage("Build"),
      stage("Test", Result.running),
      stage("Deploy"),
    ]);

    expect(graph.measuredWidth).toBeLessThan(VIEWPORT_WIDTH);
    expect(transform.scale).toBe(1);
    expect(transform.initialScale).toBe(1);
    expect(transform.positionX).toBeCloseTo(
      (VIEWPORT_WIDTH - graph.measuredWidth) / 2,
    );
  });

  it("scales a graph down to fit when it can stay readable", () => {
    const transform = computeDefaultTransform(1000, 400, 1100, 200, 1000);

    expect(transform.scale).toBeCloseTo(1000 / 1100);
    expect(transform.positionX).toBeCloseTo(0);
  });
});

describe("findFocusX", () => {
  it("prefers a running stage over a failed one", () => {
    const graph = layout(
      widePipeline({ Unit: Result.failure, Push: Result.running }),
    );

    expect(findFocusX(graph.nodes)).toBe(nodeX(graph.nodes, "Push"));
  });

  it("treats a paused stage as running", () => {
    const graph = layout(widePipeline({ Wait: Result.paused }));

    expect(findFocusX(graph.nodes)).toBe(nodeX(graph.nodes, "Wait"));
  });

  it("picks the left-most failed stage", () => {
    const graph = layout(
      widePipeline({ Lint: Result.failure, Trivy: Result.failure }),
    );

    expect(findFocusX(graph.nodes)).toBe(nodeX(graph.nodes, "Lint"));
  });

  it("has no focus for a successful run", () => {
    expect(findFocusX(layout(widePipeline()).nodes)).toBeUndefined();
  });
});
