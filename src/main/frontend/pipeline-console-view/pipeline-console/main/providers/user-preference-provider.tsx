import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// ENUMS
export enum StageViewPosition {
  TOP = "top",
  LEFT = "left",
}

export enum MainViewVisibility {
  BOTH = "both",
  STAGES_ONLY = "stagesOnly",
  GRAPH_ONLY = "graphOnly",
}

// TYPES
interface LayoutPreferences {
  stageViewPosition: StageViewPosition;
  mainViewVisibility: MainViewVisibility;
  treeViewWidth: number;
  stageViewWidth: number;
  stageViewHeight: number;
  setStageViewPosition: (position: StageViewPosition) => void;
  setMainViewVisibility: (visibility: MainViewVisibility) => void;
  setTreeViewWidth: (width: number) => void;
  setStageViewWidth: (width: number) => void;
  setStageViewHeight: (height: number) => void;
}

// CONTEXT
const LayoutPreferencesContext = createContext<LayoutPreferences | undefined>(
  undefined,
);

// KEYS
const LS_KEYS = {
  stageViewPosition: "layout.stageViewPosition",
  treeViewVisibility: "layout.treeViewVisibility",
  stageViewVisibility: "layout.stageViewVisibility",
  mainViewVisibility: "layout.mainViewVisibility",
  treeViewWidth: "layout.treeViewWidth",
  stageViewWidth: "layout.stageViewWidth",
  stageViewHeight: "layout.stageViewHeight",
};

// HELPER
const loadFromLocalStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      if (typeof fallback === "number") {
        return Number(value) as T;
      }
      return value as unknown as T;
    }
  } catch (e) {
    console.error(`Error loading localStorage key "${key}"`, e);
  }
  return fallback;
};

// PROVIDER
export const LayoutPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [stageViewPosition, setStageViewPositionState] =
    useState<StageViewPosition>(
      loadFromLocalStorage(LS_KEYS.stageViewPosition, StageViewPosition.TOP),
    );
  const [mainViewVisibility, setMainViewVisibilityState] =
    useState<MainViewVisibility>(
      loadFromLocalStorage(LS_KEYS.mainViewVisibility, MainViewVisibility.BOTH),
    );
  const [treeViewWidth, setTreeViewWidthState] = useState<number>(
    loadFromLocalStorage(LS_KEYS.treeViewWidth, 300),
  );
  const [stageViewWidth, setStageViewWidthState] = useState<number>(
    loadFromLocalStorage(LS_KEYS.stageViewWidth, 600),
  );
  const [stageViewHeight, setStageViewHeightState] = useState<number>(
    loadFromLocalStorage(LS_KEYS.stageViewHeight, 250),
  );

  // Save to localStorage
  useEffect(() => {
    window.localStorage.setItem(LS_KEYS.stageViewPosition, stageViewPosition);
  }, [stageViewPosition]);

  useEffect(() => {
    window.localStorage.setItem(LS_KEYS.mainViewVisibility, mainViewVisibility);
  }, [mainViewVisibility]);

  useEffect(() => {
    window.localStorage.setItem(
      LS_KEYS.treeViewWidth,
      treeViewWidth.toString(),
    );
  }, [treeViewWidth]);

  useEffect(() => {
    window.localStorage.setItem(
      LS_KEYS.stageViewWidth,
      stageViewWidth.toString(),
    );
  }, [stageViewWidth]);

  useEffect(() => {
    window.localStorage.setItem(
      LS_KEYS.stageViewHeight,
      stageViewHeight.toString(),
    );
  }, [stageViewHeight]);

  // Setter wrappers
  const setStageViewPosition = (position: StageViewPosition) =>
    setStageViewPositionState(position);
  const setMainViewVisibility = (visibility: MainViewVisibility) =>
    setMainViewVisibilityState(visibility);
  const setTreeViewWidth = (width: number) => setTreeViewWidthState(width);
  const setStageViewWidth = (width: number) => setStageViewWidthState(width);
  const setStageViewHeight = (height: number) =>
    setStageViewHeightState(height);

  return (
    <LayoutPreferencesContext.Provider
      value={{
        stageViewPosition,
        mainViewVisibility,
        treeViewWidth,
        stageViewWidth,
        stageViewHeight,
        setStageViewPosition,
        setMainViewVisibility,
        setTreeViewWidth,
        setStageViewWidth,
        setStageViewHeight,
      }}
    >
      {children}
    </LayoutPreferencesContext.Provider>
  );
};

// HOOK
export const useLayoutPreferences = (): LayoutPreferences => {
  const context = useContext(LayoutPreferencesContext);
  if (!context) {
    throw new Error(
      "useLayoutPreferences must be used within a LayoutPreferencesProvider",
    );
  }
  return context;
};
