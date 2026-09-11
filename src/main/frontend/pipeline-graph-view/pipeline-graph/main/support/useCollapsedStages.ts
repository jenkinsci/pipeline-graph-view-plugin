import { useCallback, useEffect, useMemo, useState } from "react";

import { Result, StageInfo } from "../PipelineGraphModel.tsx";

function loadFromStorage(key: string): Set<number> {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      return new Set(JSON.parse(stored) as number[]);
    }
  } catch (err) {
    try {
      // Bad record. Perform best-effort cleanup.
      window.localStorage.removeItem(key);
    } catch {}
  }
  return new Set();
}

function saveToStorage(key: string, ids: Set<number>) {
  try {
    if (ids.size === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function garbageCollectLocalStorage() {
  try {
    window.localStorage.key(0);
  } catch {
    // Local storage access failed, likely due to browser restrictions (expected).
    // Perform this check here so that we can log unexpected errors below.
    return;
  }
  try {
    for (const key of Object.keys(window.localStorage)) {
      // The old key prefix uses a dot as separator.
      if (!key.startsWith("pgv.collapsedStages.")) continue;
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(
      "Error during garbage collection for collapsed stages in localStorage:",
      err,
    );
  }
}

const STATE_PRIORITY: Record<string, number> = {
  [Result.failure]: 0,
  [Result.unstable]: 1,
  [Result.aborted]: 2,
  [Result.paused]: 3,
  [Result.running]: 4,
  [Result.queued]: 5,
  [Result.not_built]: 6,
  [Result.skipped]: 7,
  [Result.success]: 8,
  [Result.unknown]: 9,
};

function worstState(a: Result, b: Result): Result {
  return (STATE_PRIORITY[a] ?? 9) <= (STATE_PRIORITY[b] ?? 9) ? a : b;
}

function isTransparentState(state: Result): boolean {
  return state === Result.skipped || state === Result.not_built;
}

function aggregateChildState(stage: StageInfo): Result {
  let all = stage.state;
  let nonTransparent: Result | null = isTransparentState(stage.state)
    ? null
    : stage.state;
  for (const child of stage.children) {
    const childState = aggregateChildState(child);
    all = worstState(all, childState);
    if (!isTransparentState(childState)) {
      nonTransparent =
        nonTransparent == null
          ? childState
          : worstState(nonTransparent, childState);
    }
  }
  return nonTransparent ?? all;
}

export function collapseSelectiveStages(
  stages: StageInfo[],
  collapsedIds: Set<number>,
): StageInfo[] {
  return stages.map((stage) => {
    if (stage.children.length === 0) {
      return stage;
    }
    if (collapsedIds.has(stage.id)) {
      return {
        ...stage,
        children: [],
        collapsedChildCount: countLeafStages(stage),
        state: aggregateChildState(stage),
      };
    }
    return {
      ...stage,
      children: collapseSelectiveStages(stage.children, collapsedIds),
    };
  });
}

function countLeafStages(stage: StageInfo): number {
  if (stage.children.length === 0) {
    return 1;
  }
  return stage.children.reduce((sum, child) => sum + countLeafStages(child), 0);
}

export function collectParentStageIds(stages: StageInfo[]): Set<number> {
  const ids = new Set<number>();
  function walk(list: StageInfo[]) {
    for (const stage of list) {
      if (stage.children.length > 0) {
        ids.add(stage.id);
        walk(stage.children);
      }
    }
  }
  walk(stages);
  return ids;
}

export function collectDefaultCollapsedStageIds(
  stages: StageInfo[],
): Set<number> {
  const ids = new Set<number>();
  function walk(list: StageInfo[]) {
    for (const stage of list) {
      if (stage.children.length > 0) {
        if (stage.defaultCollapsed) {
          ids.add(stage.id);
        }
        walk(stage.children);
      }
    }
  }
  walk(stages);
  return ids;
}

/**
 * Walk the original (uncollapsed) stage tree and return the IDs of any
 * collapsed ancestors of the stage with the given id (plus the target
 * itself if it is collapsed).
 */
function findCollapsedAncestors(
  stages: StageInfo[],
  targetId: number,
  collapsedIds: Set<number>,
): number[] {
  function walk(nodes: StageInfo[]): number[] | null {
    for (const stage of nodes) {
      if (stage.id === targetId) {
        return [];
      }
      if (stage.children.length > 0) {
        const path = walk(stage.children);
        if (path !== null) {
          if (collapsedIds.has(stage.id)) {
            path.push(stage.id);
          }
          return path;
        }
      }
    }
    return null;
  }

  const path = walk(stages);
  if (path === null) return [];
  if (collapsedIds.has(targetId)) {
    path.push(targetId);
  }
  return path;
}

export function useCollapsedStages(
  normalizedParentJobPath: string,
  stages: StageInfo[],
  selectedStageId?: number,
) {
  const storageKey = `pgv.collapsedStages/${normalizedParentJobPath}`;
  const expandedDefaultsStorageKey = `pgv.expandedDefaultStages/${normalizedParentJobPath}`;

  const [storedCollapsedStageIds, setStoredCollapsedStageIds] = useState<
    Set<number>
  >(() => loadFromStorage(storageKey));
  const [expandedDefaultStageIds, setExpandedDefaultStageIds] = useState<
    Set<number>
  >(() => loadFromStorage(expandedDefaultsStorageKey));

  const defaultCollapsedStageIds = useMemo(
    () => collectDefaultCollapsedStageIds(stages),
    [stages],
  );

  const collapsedStageIds = useMemo(() => {
    const ids = new Set(storedCollapsedStageIds);
    for (const id of defaultCollapsedStageIds) {
      if (!expandedDefaultStageIds.has(id)) {
        ids.add(id);
      }
    }
    return ids;
  }, [
    storedCollapsedStageIds,
    defaultCollapsedStageIds,
    expandedDefaultStageIds,
  ]);

  useEffect(() => {
    garbageCollectLocalStorage();
  }, []);

  const toggleCollapseStage = useCallback(
    (stageId: number) => {
      const isCollapsed = collapsedStageIds.has(stageId);
      const isDefaultCollapsed = defaultCollapsedStageIds.has(stageId);

      if (isDefaultCollapsed) {
        setExpandedDefaultStageIds((prev) => {
          const next = new Set(prev);
          if (isCollapsed) {
            next.add(stageId);
          } else {
            next.delete(stageId);
          }
          saveToStorage(expandedDefaultsStorageKey, next);
          return next;
        });

        if (isCollapsed) {
          setStoredCollapsedStageIds((prev) => {
            if (!prev.has(stageId)) return prev;
            const next = new Set(prev);
            next.delete(stageId);
            saveToStorage(storageKey, next);
            return next;
          });
        }
        return;
      }

      setStoredCollapsedStageIds((prev) => {
        const next = new Set(prev);
        if (next.has(stageId)) {
          next.delete(stageId);
        } else {
          next.add(stageId);
        }
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [
      collapsedStageIds,
      defaultCollapsedStageIds,
      expandedDefaultsStorageKey,
      storageKey,
    ],
  );

  const collapseAll = useCallback(() => {
    const ids = collectParentStageIds(stages);
    setStoredCollapsedStageIds(ids);
    saveToStorage(storageKey, ids);

    const expanded = new Set<number>();
    setExpandedDefaultStageIds(expanded);
    saveToStorage(expandedDefaultsStorageKey, expanded);
  }, [stages, storageKey, expandedDefaultsStorageKey]);

  const expandAll = useCallback(() => {
    const collapsed = new Set<number>();
    setStoredCollapsedStageIds(collapsed);
    saveToStorage(storageKey, collapsed);

    const expanded = new Set(defaultCollapsedStageIds);
    setExpandedDefaultStageIds(expanded);
    saveToStorage(expandedDefaultsStorageKey, expanded);
  }, [defaultCollapsedStageIds, storageKey, expandedDefaultsStorageKey]);

  const hasCollapsibleStages = useMemo(
    () => collectParentStageIds(stages).size > 0,
    [stages],
  );

  const effectiveStages = useMemo(
    () =>
      collapsedStageIds.size > 0
        ? collapseSelectiveStages(stages, collapsedStageIds)
        : stages,
    [stages, collapsedStageIds],
  );

  // Auto-expand collapsed ancestors when a stage is selected (e.g. via
  // the tree sidebar or ?selected-node= URL param).
  useEffect(() => {
    if (selectedStageId == null || collapsedStageIds.size === 0) return;
    const ancestors = findCollapsedAncestors(
      stages,
      selectedStageId,
      collapsedStageIds,
    );
    if (ancestors.length === 0) return;
    setStoredCollapsedStageIds((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) {
        next.delete(id);
      }
      saveToStorage(storageKey, next);
      return next;
    });

    setExpandedDefaultStageIds((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) {
        if (defaultCollapsedStageIds.has(id)) {
          next.add(id);
        }
      }
      saveToStorage(expandedDefaultsStorageKey, next);
      return next;
    });
  }, [selectedStageId]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to selection changes

  return {
    collapsedStageIds,
    toggleCollapseStage,
    collapseAll,
    expandAll,
    hasCollapsibleStages,
    effectiveStages,
  };
}
