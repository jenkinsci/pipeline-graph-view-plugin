import { Result, StageInfo } from "../PipelineGraphModel.tsx";
import {
  collapseSelectiveStages,
  collectParentStageIds,
} from "./useCollapsedStages.ts";

describe("collapseSelectiveStages", () => {
  it("should leave leaf stages unchanged", () => {
    const stages: StageInfo[] = [
      {
        name: "Build",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [],
      } as unknown as StageInfo,
    ];
    const result = collapseSelectiveStages(stages, new Set([1]));
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(0);
    expect(result[0].collapsedChildCount).toBeUndefined();
  });

  it("should collapse a named parent stage", () => {
    const stages: StageInfo[] = [
      {
        name: "Test",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Unit",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [],
          } as unknown as StageInfo,
          {
            name: "Integration",
            state: Result.failure,
            id: 3,
            type: "STAGE",
            children: [],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];
    const result = collapseSelectiveStages(stages, new Set([1]));
    expect(result[0].children).toHaveLength(0);
    expect(result[0].collapsedChildCount).toBe(2);
    expect(result[0].state).toBe(Result.failure);
  });

  it("should not collapse stages not in the set", () => {
    const stages: StageInfo[] = [
      {
        name: "Test",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Unit",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];
    const result = collapseSelectiveStages(stages, new Set([999]));
    expect(result[0].children).toHaveLength(1);
    expect(result[0].collapsedChildCount).toBeUndefined();
  });

  it("should collapse recursively within non-collapsed parents", () => {
    const stages: StageInfo[] = [
      {
        name: "Outer",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Inner",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [
              {
                name: "Leaf",
                state: Result.success,
                id: 3,
                type: "STAGE",
                children: [],
              } as unknown as StageInfo,
            ],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];
    const result = collapseSelectiveStages(stages, new Set([2]));
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].children).toHaveLength(0);
    expect(result[0].children[0].collapsedChildCount).toBe(1);
  });

  it("should count leaf stages through deep nesting", () => {
    const stages: StageInfo[] = [
      {
        name: "Root",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Mid",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [
              {
                name: "Leaf1",
                state: Result.success,
                id: 3,
                type: "STAGE",
                children: [],
              } as unknown as StageInfo,
              {
                name: "Leaf2",
                state: Result.success,
                id: 4,
                type: "STAGE",
                children: [],
              } as unknown as StageInfo,
            ],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];
    const result = collapseSelectiveStages(stages, new Set([1]));
    expect(result[0].collapsedChildCount).toBe(2);
  });

  it("should handle empty collapsedNames (no-op)", () => {
    const stages: StageInfo[] = [
      {
        name: "Build",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Sub",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];
    const result = collapseSelectiveStages(stages, new Set());
    expect(result[0].children).toHaveLength(1);
  });
});

describe("collectParentStageIds", () => {
  it("should return empty set for leaf-only stages", () => {
    const stages: StageInfo[] = [
      {
        name: "A",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [],
      } as unknown as StageInfo,
      {
        name: "B",
        state: Result.success,
        id: 2,
        type: "STAGE",
        children: [],
      } as unknown as StageInfo,
    ];
    expect(collectParentStageIds(stages).size).toBe(0);
  });

  it("should collect top-level parent stage ids", () => {
    const stages: StageInfo[] = [
      {
        name: "Parent",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Child",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
      {
        name: "Leaf",
        state: Result.success,
        id: 3,
        type: "STAGE",
        children: [],
      } as unknown as StageInfo,
    ];
    const result = collectParentStageIds(stages);
    expect(result).toEqual(new Set([1]));
  });

  it("should collect nested parent stage ids", () => {
    const stages: StageInfo[] = [
      {
        name: "Root",
        state: Result.success,
        id: 1,
        type: "STAGE",
        children: [
          {
            name: "Mid",
            state: Result.success,
            id: 2,
            type: "STAGE",
            children: [
              {
                name: "Leaf",
                state: Result.success,
                id: 3,
                type: "STAGE",
                children: [],
              } as unknown as StageInfo,
            ],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];
    const result = collectParentStageIds(stages);
    expect(result).toEqual(new Set([1, 2]));
  });
});
