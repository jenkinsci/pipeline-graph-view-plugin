import { act, renderHook } from "@testing-library/react";

import { Result, StageInfo } from "../PipelineGraphModel.tsx";
import {
  collapseSelectiveStages,
  collectDefaultCollapsedStageIds,
  collectParentStageIds,
  useCollapsedStages,
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

describe("useCollapsedStages", () => {
  const stages: StageInfo[] = [
    {
      name: "Default parent",
      state: Result.success,
      id: 1,
      type: "STAGE",
      defaultCollapsed: true,
      children: [
        {
          name: "Default child",
          state: Result.success,
          id: 2,
          type: "STAGE",
          children: [],
        } as unknown as StageInfo,
      ],
    } as unknown as StageInfo,
    {
      name: "Normal parent",
      state: Result.success,
      id: 3,
      type: "STAGE",
      children: [
        {
          name: "Normal child",
          state: Result.success,
          id: 4,
          type: "STAGE",
          children: [],
        } as unknown as StageInfo,
      ],
    } as unknown as StageInfo,
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should collapse default-collapsed stages initially", () => {
    const { result } = renderHook(() => useCollapsedStages("job/test", stages));

    expect(result.current.collapsedStageIds).toEqual(new Set([1]));
    expect(result.current.effectiveStages[0].children).toHaveLength(0);
    expect(result.current.effectiveStages[1].children).toHaveLength(1);
  });

  it("should persist explicit expansion of a default-collapsed stage", () => {
    const first = renderHook(() => useCollapsedStages("job/test", stages));

    act(() => {
      first.result.current.toggleCollapseStage(1);
    });

    expect(first.result.current.collapsedStageIds).toEqual(new Set());
    first.unmount();

    const second = renderHook(() => useCollapsedStages("job/test", stages));
    expect(second.result.current.collapsedStageIds).toEqual(new Set());
  });

  it("should apply defaults again for a different build", () => {
    const first = renderHook(() => useCollapsedStages("job/test/1", stages));

    act(() => {
      first.result.current.toggleCollapseStage(1);
    });

    expect(first.result.current.collapsedStageIds).toEqual(new Set());
    first.unmount();

    const second = renderHook(() => useCollapsedStages("job/test/2", stages));

    expect(second.result.current.collapsedStageIds).toEqual(new Set([1]));
  });

  it("should persist expand all for default-collapsed stages", () => {
    const first = renderHook(() => useCollapsedStages("job/test", stages));

    act(() => {
      first.result.current.expandAll();
    });

    first.unmount();

    const second = renderHook(() => useCollapsedStages("job/test", stages));
    expect(second.result.current.collapsedStageIds).toEqual(new Set());
  });

  it("should restore the default after explicitly collapsing it again", () => {
    const first = renderHook(() => useCollapsedStages("job/test", stages));

    act(() => {
      first.result.current.toggleCollapseStage(1);
    });
    act(() => {
      first.result.current.toggleCollapseStage(1);
    });

    first.unmount();

    const second = renderHook(() => useCollapsedStages("job/test", stages));
    expect(second.result.current.collapsedStageIds).toEqual(new Set([1]));
  });
});

describe("collectDefaultCollapsedStageIds", () => {
  it("should collect only collapsible stages marked as default collapsed", () => {
    const stages: StageInfo[] = [
      {
        id: 1,
        type: "STAGE",
        defaultCollapsed: true,
        children: [
          {
            id: 2,
            type: "STAGE",
            defaultCollapsed: false,
            children: [],
          } as unknown as StageInfo,
        ],
      } as unknown as StageInfo,
    ];

    expect(collectDefaultCollapsedStageIds(stages)).toEqual(new Set([1]));
  });
});
