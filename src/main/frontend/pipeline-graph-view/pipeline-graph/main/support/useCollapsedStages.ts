import { useCallback, useEffect, useMemo, useState } from "react";

import { Result, StageInfo } from "../PipelineGraphModel.tsx";

const KEY_PREFIX = "pgv.collapsedStages.";
const EXPIRE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 1_000;

type StoredCollapsedStages = number[] | { lastUsed: string; ids: number[] };

function loadFromStorage(key: string): Set<number> {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredCollapsedStages;
      const ids = new Set(Array.isArray(parsed) ? parsed : parsed.ids);
      saveToStorage(key, ids); // Bump the last used timestamp.
      return ids;
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
    window.localStorage.setItem(
      key,
      JSON.stringify({ lastUsed: new Date().toISOString(), ids: [...ids] }),
    );
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
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith(KEY_PREFIX),
    );
    const cutOff = new Date(new Date().getTime() - EXPIRE_MS).toISOString();
    if (keys.length > MAX_ENTRIES) {
      // Retain at most MAX_ENTRIES entries in localStorage. Discard the rest.
      for (const key of keys.splice(0, keys.length - MAX_ENTRIES)) {
        window.localStorage.removeItem(key);
      }
    }
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        window.localStorage.removeItem(key);
        continue;
      }
      const parsed = JSON.parse(raw) as StoredCollapsedStages;
      if (Array.isArray(parsed)) {
        // Old schema. We don't know when this record was created. Use the current timestamp. It will expire eventually.
        saveToStorage(key, new Set(parsed));
      } else if (parsed.lastUsed < cutOff) {
        window.localStorage.removeItem(key);
      }
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
  currentRunPath: string,
  stages: StageInfo[],
  selectedStageId?: number,
) {
  const storageKey = KEY_PREFIX + currentRunPath;
  const [collapsedStageIds, setCollapsedStageIds] = useState<Set<number>>(() =>
    loadFromStorage(storageKey),
  );

  useEffect(() => {
    garbageCollectLocalStorage();
  }, []);

  const toggleCollapseStage = useCallback(
    (stageId: number) => {
      setCollapsedStageIds((prev) => {
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
    [storageKey],
  );

  const setCollapsedIds = useCallback(
    (ids: Set<number>) => {
      setCollapsedStageIds(ids);
      saveToStorage(storageKey, ids);
    },
    [storageKey],
  );

  const collapseAll = useCallback(() => {
    setCollapsedIds(collectParentStageIds(stages));
  }, [stages, setCollapsedIds]);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, [setCollapsedIds]);

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
    setCollapsedStageIds((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) {
        next.delete(id);
      }
      saveToStorage(storageKey, next);
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
