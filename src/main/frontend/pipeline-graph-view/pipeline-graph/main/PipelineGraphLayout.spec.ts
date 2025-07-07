import { describe, expect } from "vitest";

import { DEFAULT_LOCALE } from "../../../common/i18n/index.ts";
import { defaultMessages } from "../../../common/i18n/messages.ts";
import { createNodeColumns, layoutGraph } from "./PipelineGraphLayout.ts";
import {
  LayoutInfo,
  Result,
  StageInfo,
  StageType,
} from "./PipelineGraphModel.tsx";

describe("PipelineGraphLayout", () => {
  const baseStage: StageInfo = {
    name: "",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 0,
    type: "STAGE",
    children: [],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    agent: "built-in",
    url: "?selected-node=0",
  };

  const makeStage = (
    id: number,
    name: string,
    children: Array<StageInfo> = [],
  ): StageInfo => {
    return { ...baseStage, id, name, children };
  };

  const makeParallel = (
    id: number,
    name: string,
    children: Array<StageInfo> = [],
  ): StageInfo => {
    return {
      ...baseStage,
      id,
      name,
      children,
      type: "PARALLEL" as StageType,
    };
  };

  describe("createNodeColumns", () => {
    const makeNode = (
      id: number,
      name: string,
      seqContainerName: string | undefined = undefined,
    ) => {
      return {
        id,
        name,
        stage: { id, name },
        ...(seqContainerName !== undefined ? { seqContainerName } : {}),
      };
    };

    it("returns no columns if no stages", () => {
      const columns = createNodeColumns([]);
      expect(columns).toEqual([]);
    });

    it("returns proper columns (unstableSmokes)", () => {
      const columns = createNodeColumns([
        makeStage(4, "unstable-one"),
        makeStage(15, "success"),
        makeStage(20, "unstable-two"),
        makeStage(26, "failure"),
      ]);

      expect(columns).toMatchObject([
        {
          hasBranchLabels: false,
          topStage: { name: "unstable-one", id: 4 },
          rows: [[makeNode(4, "unstable-one")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "success", id: 15 },
          rows: [[makeNode(15, "success")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "unstable-two", id: 20 },
          rows: [[makeNode(20, "unstable-two")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "failure", id: 26 },
          rows: [[makeNode(26, "failure")]],
        },
      ]);
    });

    it("returns proper columns (complexSmokes)", () => {
      const columns = createNodeColumns([
        makeStage(6, "Non-Parallel Stage"),
        makeStage(11, "Parallel Stage", [
          makeParallel(15, "Branch A"),
          makeParallel(16, "Branch B"),
          makeParallel(17, "Branch C", [
            makeStage(25, "Nested 1"),
            makeStage(38, "Nested 2"),
          ]),
        ]),
        makeStage(49, "Skipped stage"),
        makeStage(53, "Parallel Stage 2", [
          makeParallel(57, "Branch A"),
          makeParallel(58, "Branch B"),
          makeParallel(59, "Branch C", [
            makeStage(67, "Nested 1"),
            makeStage(80, "Nested 2"),
          ]),
        ]),
      ]);

      expect(columns).toMatchObject([
        {
          hasBranchLabels: false,
          topStage: { name: "Non-Parallel Stage", id: 6 },
          rows: [[makeNode(6, "Non-Parallel Stage")]],
        },
        {
          hasBranchLabels: true,
          topStage: { name: "Parallel Stage", id: 11 },
          rows: [
            [makeNode(15, "Branch A")],
            [makeNode(16, "Branch B")],
            [
              makeNode(25, "Nested 1", "Branch C"),
              makeNode(38, "Nested 2", "Branch C"),
            ],
          ],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Skipped stage", id: 49 },
          rows: [[makeNode(49, "Skipped stage")]],
        },
        {
          hasBranchLabels: true,
          topStage: { name: "Parallel Stage 2", id: 53 },
          rows: [
            [makeNode(57, "Branch A")],
            [makeNode(58, "Branch B")],
            [
              makeNode(67, "Nested 1", "Branch C"),
              makeNode(80, "Nested 2", "Branch C"),
            ],
          ],
        },
      ]);
    });

    it("returns proper columns (GH#63.1)", () => {
      const columns = createNodeColumns([
        makeStage(6, "Test", [
          makeParallel(9, "Matrix - PLATFORM = '1'", [
            makeStage(20, "Stage 1"),
            makeStage(30, "Stage 2"),
            makeStage(40, "Stage 3"),
          ]),
          makeParallel(10, "Matrix - PLATFORM = '2'", [
            makeStage(22, "Stage 1"),
            makeStage(32, "Stage 2"),
            makeStage(42, "Stage 3"),
          ]),
        ]),
      ]);

      expect(columns).toMatchObject([
        {
          hasBranchLabels: true,
          topStage: { name: "Test", id: 6 },
          rows: [
            [
              makeNode(20, "Stage 1", "Matrix - PLATFORM = '1'"),
              makeNode(30, "Stage 2", "Matrix - PLATFORM = '1'"),
              makeNode(40, "Stage 3", "Matrix - PLATFORM = '1'"),
            ],
            [
              makeNode(22, "Stage 1", "Matrix - PLATFORM = '2'"),
              makeNode(32, "Stage 2", "Matrix - PLATFORM = '2'"),
              makeNode(42, "Stage 3", "Matrix - PLATFORM = '2'"),
            ],
          ],
        },
      ]);
    });

    it("returns proper columns (GH#63.2)", () => {
      const columns = createNodeColumns([
        makeStage(6, "build and run", [
          makeParallel(12, "darwin-amd64", [
            makeStage(24, "build"),
            makeStage(39, "run"),
            makeStage(55, "unit test"),
          ]),
          makeParallel(11, "linux-amd64", [
            makeStage(22, "build"),
            makeStage(36, "run"),
            makeStage(53, "unit test"),
            makeStage(64, "load test"),
            makeStage(71, "deploy to storage"),
          ]),
          makeParallel(10, "linux-armv6", [
            makeStage(20, "build"),
            makeStage(34, "run"),
          ]),
        ]),
      ]);

      expect(columns).toMatchObject([
        {
          hasBranchLabels: true,
          topStage: { name: "build and run", id: 6 },
          rows: [
            [
              makeNode(24, "build", "darwin-amd64"),
              makeNode(39, "run", "darwin-amd64"),
              makeNode(55, "unit test", "darwin-amd64"),
            ],
            [
              makeNode(22, "build", "linux-amd64"),
              makeNode(36, "run", "linux-amd64"),
              makeNode(53, "unit test", "linux-amd64"),
              makeNode(64, "load test", "linux-amd64"),
              makeNode(71, "deploy to storage", "linux-amd64"),
            ],
            [
              makeNode(20, "build", "linux-armv6"),
              makeNode(34, "run", "linux-armv6"),
            ],
          ],
        },
      ]);
    });

    it("returns proper columns (GH#50)", () => {
      const columns = createNodeColumns([
        makeStage(3, "Parallel", [
          makeParallel(4, "parallel:0", [
            makeStage(6, "parent:0", [
              makeStage(9, "child:0"),
              makeStage(14, "child:1"),
              makeStage(19, "child:3"),
            ]),
          ]),
        ]),
        makeStage(29, "parent:1"),
      ]);

      expect(columns).toMatchObject([
        {
          hasBranchLabels: true,
          topStage: { name: "Parallel", id: 3 },
          rows: [
            [
              makeNode(6, "parent:0", "parallel:0"),
              makeNode(9, "child:0", "parent:0"),
              makeNode(14, "child:1", "parent:0"),
              makeNode(19, "child:3", "parent:0"),
            ],
          ],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "parent:1", id: 29 },
          rows: [[makeNode(29, "parent:1")]],
        },
      ]);
    });

    it("returns proper columns (GH#18)", () => {
      const columns = createNodeColumns([
        makeStage(6, "Stage 1"),
        makeStage(11, "Stage 2"),
        makeStage(31, "Stage6, When anyOf", [
          makeStage(12, "Stage 3"),
          makeStage(33, "Parallel", [
            makeParallel(36, "Parallel Stage 1", [
              makeStage(43, "Parallel Stage 1.1"),
              makeStage(61, "Parallel Stage 1.2"),
            ]),
            makeParallel(37, "Parallel Stage 2", [
              makeStage(45, "Parallel Stage 2.1"),
              makeStage(63, "Parallel Stage 2.2"),
            ]),
          ]),
          makeStage(13, "Stage 4", [
            makeStage(14, "Stage 5", [makeStage(15, "Stage 7")]),
          ]),
        ]),
      ]);

      expect(columns).toMatchObject([
        {
          hasBranchLabels: false,
          topStage: { name: "Stage 1", id: 6 },
          rows: [[makeNode(6, "Stage 1")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Stage 2", id: 11 },
          rows: [[makeNode(11, "Stage 2")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Stage6, When anyOf", id: 31 },
          rows: [[makeNode(31, "Stage6, When anyOf")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Stage 3", id: 12 },
          rows: [[makeNode(12, "Stage 3")]],
        },
        {
          hasBranchLabels: true,
          topStage: { name: "Parallel", id: 33 },
          rows: [
            [
              makeNode(43, "Parallel Stage 1.1", "Parallel Stage 1"),
              makeNode(61, "Parallel Stage 1.2", "Parallel Stage 1"),
            ],
            [
              makeNode(45, "Parallel Stage 2.1", "Parallel Stage 2"),
              makeNode(63, "Parallel Stage 2.2", "Parallel Stage 2"),
            ],
          ],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Stage 4", id: 13 },
          rows: [[makeNode(13, "Stage 4")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Stage 5", id: 14 },
          rows: [[makeNode(14, "Stage 5")]],
        },
        {
          hasBranchLabels: false,
          topStage: { name: "Stage 7", id: 15 },
          rows: [[makeNode(15, "Stage 7")]],
        },
      ]);
    });
  });

  describe("layoutGraph", () => {
    const layout: LayoutInfo = {
      nodeSpacingH: 140,
      parallelSpacingH: 140,
      nodeSpacingV: 70,
      nodeRadius: 12,
      terminalRadius: 10,
      curveRadius: 15,
      connectorStrokeWidth: 2,
      labelOffsetV: 22,
      smallLabelOffsetV: 15,
      ypStart: 55,
    };

    const makeSmallLabel = (stageName: string) => {
      return {
        text: stageName,
      };
    };

    it("should not generate small labels for top stage columns with no children", () => {
      const graph = layoutGraph(
        [
          makeStage(6, "Non-Parallel Stage"),
          makeStage(11, "Parallel Stage", [
            makeParallel(15, "Branch A - P1"),
            makeParallel(16, "Branch B - P1"),
            makeParallel(17, "Branch C - P1", [
              makeStage(25, "Nested 1 - P1"),
              makeStage(38, "Nested 2 - P1"),
            ]),
          ]),
          makeStage(49, "Skipped stage"),
          makeStage(53, "Parallel Stage 2", [
            makeParallel(57, "Branch A - P2"),
            makeParallel(58, "Branch B - P2"),
            makeParallel(59, "Branch C - P2", [
              makeStage(67, "Nested 1 - P2"),
              makeStage(80, "Nested 2 - P2"),
            ]),
          ]),
        ],
        layout,
        false,
        defaultMessages(DEFAULT_LOCALE),
        false,
        false,
      );

      expect(graph.smallLabels).toMatchObject([
        makeSmallLabel("Branch A - P1"),
        makeSmallLabel("Branch B - P1"),
        makeSmallLabel("Nested 1 - P1"),
        makeSmallLabel("Nested 2 - P1"),
        makeSmallLabel("Branch A - P2"),
        makeSmallLabel("Branch B - P2"),
        makeSmallLabel("Nested 1 - P2"),
        makeSmallLabel("Nested 2 - P2"),
      ]);
    });
  });
});
