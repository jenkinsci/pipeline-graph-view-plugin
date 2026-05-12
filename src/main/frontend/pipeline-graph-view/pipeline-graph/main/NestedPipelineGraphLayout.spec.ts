import { DEFAULT_LOCALE } from "../../../common/i18n/index.ts";
import { defaultMessages } from "../../../common/i18n/messages.ts";
import {
  nestedGraphLayout,
  removeFalseOptionalGraphNodeFlags,
} from "./NestedPipelineGraphLayout.ts";
import {
  ConnectionEdge,
  defaultLayout,
  GraphNode,
  NodeInfo,
  NodeLabelInfo,
  StageInfo,
} from "./PipelineGraphModel.tsx";

describe("NestedPipelineGraphLayout", () => {
  describe("nestedGraphLayout", () => {
    describe("complexParallelSmokes.jenkinsfile", () => {
      const raw =
        '[{"name":"Non-Parallel Stage","state":"success","id":"6","type":"STAGE","children":[]},{"name":"Parallel Stage","state":"success","id":"12","type":"STAGE","children":[{"name":"Branch A","state":"success","id":"16","type":"PARALLEL","children":[]},{"name":"Branch B","state":"success","id":"17","type":"PARALLEL","children":[]},{"name":"Branch C","state":"success","id":"18","type":"PARALLEL","children":[{"name":"Nested 1","state":"success","id":"26","type":"STAGE","children":[]},{"name":"Nested 2","state":"success","id":"42","type":"STAGE","children":[]}]}]},{"name":"Skipped stage","state":"skipped","id":"54","type":"STAGE","children":[]}]';

      it("should render layout", () => {
        shouldMatchSnapshot(raw, false);
      });
      it("should render collapsed layout", () => {
        shouldMatchSnapshot(raw, true);
      });
    });

    describe("gh771_non_wrapped_parallel.jenkinsfile", () => {
      const raw =
        '[{"name":"1","state":"success","id":"6","type":"STAGE","children":[{"name":"Parallel","state":"success","id":"7","type":"PARALLEL_BLOCK","children":[{"name":"branch 1.1","state":"success","id":"9","type":"PARALLEL","children":[]},{"name":"branch 1.2","state":"success","id":"10","type":"PARALLEL","children":[]}]},{"name":"Parallel","state":"success","id":"16","type":"PARALLEL_BLOCK","children":[{"name":"branch 2.1","state":"success","id":"18","type":"PARALLEL","children":[]},{"name":"branch 2.2","state":"success","id":"19","type":"PARALLEL","children":[]}]}]},{"name":"2","state":"success","id":"28","type":"STAGE","children":[{"name":"branch 3.1","state":"success","id":"31","type":"PARALLEL","children":[]},{"name":"branch 3.2","state":"success","id":"32","type":"PARALLEL","children":[]}]}]';

      it("should render layout", () => {
        shouldMatchSnapshot(raw, false);
      });
      it("should render collapsed layout", () => {
        shouldMatchSnapshot(raw, true);
      });
    });

    describe("gh1155_complexSmokes.jenkinsfile", () => {
      const raw =
        '[{"name":"Non-Parallel Stage","state":"success","id":"6","type":"STAGE","children":[]},{"name":"Parallel Stage","state":"success","id":"11","type":"STAGE","children":[{"name":"Branch A","state":"success","id":"17","type":"PARALLEL","children":[]},{"name":"Skipped Branch B","state":"skipped","id":"18","type":"PARALLEL","children":[]},{"name":"Branch C","state":"success","id":"19","type":"PARALLEL","children":[{"name":"Nested 1 C","state":"success","id":"35","type":"STAGE","children":[]},{"name":"Nested 2 C","state":"success","id":"60","type":"STAGE","children":[]},{"name":"Skipped stage c nested 3","state":"skipped","id":"76","type":"STAGE","children":[]},{"name":"Skipped stage c nested 4","state":"skipped","id":"84","type":"STAGE","children":[]}]},{"name":"Branch D","state":"success","id":"20","type":"PARALLEL","children":[{"name":"Skipped stage d nested 1","state":"skipped","id":"37","type":"STAGE","children":[]},{"name":"Nested 2 D","state":"success","id":"55","type":"STAGE","children":[]}]},{"name":"Branch E","state":"success","id":"21","type":"PARALLEL","children":[{"name":"Skipped stage e nested 1","state":"skipped","id":"39","type":"STAGE","children":[]},{"name":"Nested 2 E","state":"success","id":"57","type":"STAGE","children":[]},{"name":"Nested 3 E","state":"success","id":"71","type":"STAGE","children":[]},{"name":"Nested 4 E","state":"success","id":"86","type":"STAGE","children":[]}]}]},{"name":"Skipped stage 1","state":"skipped","id":"103","type":"STAGE","children":[]},{"name":"Skipped stage 2","state":"skipped","id":"118","type":"STAGE","children":[]},{"name":"Parallel Stage 2","state":"success","id":"133","type":"STAGE","children":[{"name":"Branch A","state":"skipped","id":"137","type":"PARALLEL","children":[]},{"name":"Branch B","state":"success","id":"138","type":"PARALLEL","children":[]},{"name":"Branch C","state":"success","id":"139","type":"PARALLEL","children":[{"name":"Nested 1","state":"success","id":"149","type":"STAGE","children":[]},{"name":"Nested 2","state":"success","id":"160","type":"STAGE","children":[]}]}]}]';

      it("should render layout", () => {
        shouldMatchSnapshot(raw, false);
      });
      it("should render collapsed layout", () => {
        shouldMatchSnapshot(raw, true);
      });
    });

    describe("gh1155_nestedParallel.jenkinsfile", () => {
      const raw =
        '[{"name":"Top level","state":"success","id":"4","type":"STAGE","children":[{"name":"BranchA","state":"success","id":"7","type":"PARALLEL","children":[{"name":"Branch A","state":"success","id":"10","type":"STAGE","children":[{"name":"A-1","state":"success","id":"16","type":"PARALLEL","children":[{"name":"A-1-1","state":"success","id":"33","type":"PARALLEL","children":[]},{"name":"A-1-2","state":"success","id":"34","type":"PARALLEL","children":[]}]},{"name":"A-2","state":"success","id":"17","type":"PARALLEL","children":[]}]}]},{"name":"BranchB","state":"success","id":"8","type":"PARALLEL","children":[{"name":"Branch B","state":"success","id":"12","type":"STAGE","children":[{"name":"B-1","state":"success","id":"21","type":"PARALLEL","children":[{"name":"B-1-1","state":"success","id":"28","type":"STAGE","children":[]},{"name":"B-1-2","state":"success","id":"55","type":"STAGE","children":[{"name":"B-1-2-1","state":"success","id":"60","type":"PARALLEL","children":[]},{"name":"B-1-2-2","state":"success","id":"61","type":"PARALLEL","children":[]}]}]},{"name":"B-2","state":"success","id":"22","type":"PARALLEL","children":[]}]}]}]}]';

      it("should render layout", () => {
        shouldMatchSnapshot(raw, false);
      });
      it("should render collapsed layout", () => {
        shouldMatchSnapshot(raw, true);
      });
    });

    describe("gh1155_smokeTest.jenkinsfile", () => {
      const raw =
        '[{"name":"Parallel","state":"unstable","id":"5","type":"PARALLEL_BLOCK","children":[{"name":"A","state":"success","id":"8","type":"PARALLEL","children":[{"name":"Checkout","state":"success","id":"12","type":"STAGE","children":[]},{"name":"Test","state":"success","id":"26","type":"STAGE","children":[{"name":"A1","state":"success","id":"35","type":"PARALLEL","children":[]},{"name":"A2","state":"success","id":"36","type":"PARALLEL","children":[]},{"name":"A3","state":"success","id":"37","type":"PARALLEL","children":[]}]},{"name":"Test 2","state":"success","id":"67","type":"STAGE","children":[{"name":"A1","state":"success","id":"72","type":"PARALLEL","children":[]},{"name":"A2","state":"success","id":"73","type":"PARALLEL","children":[]}]},{"name":"Coverage","state":"success","id":"99","type":"STAGE","children":[]}]},{"name":"B","state":"unstable","id":"9","type":"PARALLEL","children":[{"name":"Checkout","state":"success","id":"14","type":"STAGE","children":[]},{"name":"Build","state":"success","id":"28","type":"STAGE","children":[]},{"name":"Parallel","state":"unstable","id":"49","type":"PARALLEL_BLOCK","children":[{"name":"B1","state":"success","id":"51","type":"PARALLEL","children":[]},{"name":"B2","state":"unstable","id":"52","type":"PARALLEL","children":[]}]},{"name":"Archive","state":"success","id":"85","type":"STAGE","children":[]}]},{"name":"C","state":"success","id":"10","type":"PARALLEL","children":[{"name":"Stage - 1","state":"success","id":"16","type":"STAGE","children":[]},{"name":"Stage - 2","state":"success","id":"31","type":"STAGE","children":[]},{"name":"Stage - 3","state":"success","id":"57","type":"STAGE","children":[]},{"name":"Stage - 4","state":"success","id":"76","type":"STAGE","children":[]},{"name":"Stage - 5","state":"success","id":"92","type":"STAGE","children":[]},{"name":"Stage - 6","state":"success","id":"104","type":"STAGE","children":[]},{"name":"Stage - 7","state":"success","id":"111","type":"STAGE","children":[]}]}]}]';

      it("should render layout", () => {
        shouldMatchSnapshot(raw, false);
      });
      it("should render collapsed layout", () => {
        shouldMatchSnapshot(raw, true);
      });
    });
  });
});

/**
 * Lean view on GraphNode to make test snapshots easier to read.
 */
function leanEdge(full: ConnectionEdge): ConnectionEdge {
  const lean: ConnectionEdge = {
    x: full.x,
    y: full.y,
    key: full.key,
    type: full.type,
  };
  // Cherry-pick truthy fields that are relevant for connections.
  if (full.firstChildIsSkipped) lean.firstChildIsSkipped = true;
  if (full.isHidden) lean.isHidden = true;
  if (full.isParallel) lean.isParallel = true;
  if (full.isPlaceholder) lean.isPlaceholder = true;
  if (full.isSkipped) lean.isSkipped = true;
  return lean;
}

/**
 * Trim verbose fields on GraphNode to make test snapshots easier to read.
 */
function trimGraphNode(node: GraphNode) {
  if ("stage" in node && node.stage) {
    // Hide verbose input data.
    node.stage.children = [];
  }
  removeFalseOptionalGraphNodeFlags(node);
}

/**
 * Lean stage view on NodeLabelInfo to make test snapshots easier to read.
 */
function trimNodeInfoOnLabel(label: NodeLabelInfo) {
  // Hide NodeInfo fields that are not relevant for labels.
  label.node = { isPlaceholder: label.node.isPlaceholder } as NodeInfo;
}

function shouldMatchSnapshot(raw: string, collapsed: boolean) {
  const stages = JSON.parse(raw) as StageInfo[];
  const graph = nestedGraphLayout(
    stages,
    defaultLayout,
    collapsed,
    defaultMessages(DEFAULT_LOCALE),
    !collapsed,
    collapsed,
  );
  for (const labels of [
    graph.smallLabels,
    graph.bigLabels,
    graph.branchLabels,
    graph.timings,
  ]) {
    for (const label of labels) {
      trimNodeInfoOnLabel(label);
    }
  }
  for (const c of graph.connections) {
    c.sourceNodes = c.sourceNodes.map(leanEdge);
    c.destinationNodes = c.destinationNodes.map(leanEdge);
    c.skippedNodes = c.skippedNodes.map(leanEdge);
  }
  for (const node of graph.allNodes) {
    trimGraphNode(node);
  }
  expect(graph).toMatchSnapshot();
}
