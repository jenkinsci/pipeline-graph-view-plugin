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
  /**
   * Returns true if the current window width is less than the mobile breakpoint.
   * Used for disabling customization options in favor of a mobile-friendly layout.
   */
  isMobile: boolean;
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
const loadFromLocalStorage = <T,>(
  key: string,
  normalizedParentJobPath: string,
  fallback: T,
): T => {
  if (typeof window === "undefined") return fallback;
  try {
    let value = window.localStorage.getItem(
      `${key}/${normalizedParentJobPath}`,
    );
    if (value === null) {
      // Fallback to previous shared key, which also serves as local default form the last job that updated it.
      value = window.localStorage.getItem(key);
    }
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

const storeInLocalStorage = (
  key: string,
  normalizedParentJobPath: string,
  value: string,
) => {
  try {
    window.localStorage.setItem(`${key}/${normalizedParentJobPath}`, value);
    // Provide default for any other job without a specific value.
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error storing localStorage key "${key}"`, e);
  }
};

const MOBILE_BREAKPOINT = 700;

// PROVIDER
export const LayoutPreferencesProvider = ({
  normalizedParentJobPath,
  children,
}: {
  normalizedParentJobPath: string;
  children: ReactNode;
}) => {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1000,
  );

  const [persistedStageViewPosition, setStageViewPositionState] =
    useState<StageViewPosition>(
      loadFromLocalStorage(
        LS_KEYS.stageViewPosition,
        normalizedParentJobPath,
        StageViewPosition.TOP,
      ),
    );
  const [persistedMainViewVisibility, setMainViewVisibilityState] =
    useState<MainViewVisibility>(
      loadFromLocalStorage(
        LS_KEYS.mainViewVisibility,
        normalizedParentJobPath,
        MainViewVisibility.BOTH,
      ),
    );

  const [treeViewWidth, setTreeViewWidthState] = useState<number>(
    loadFromLocalStorage(LS_KEYS.treeViewWidth, normalizedParentJobPath, 300),
  );
  const [stageViewWidth, setStageViewWidthState] = useState<number>(
    loadFromLocalStorage(LS_KEYS.stageViewWidth, normalizedParentJobPath, 600),
  );
  const [stageViewHeight, setStageViewHeightState] = useState<number>(
    loadFromLocalStorage(LS_KEYS.stageViewHeight, normalizedParentJobPath, 250),
  );

  // Handle responsive override
  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  const stageViewPosition = isMobile
    ? StageViewPosition.TOP
    : persistedStageViewPosition;
  const mainViewVisibility = isMobile
    ? MainViewVisibility.GRAPH_ONLY
    : persistedMainViewVisibility;

  // Save to localStorage only when not in mobile mode
  useEffect(() => {
    if (!isMobile) {
      storeInLocalStorage(
        LS_KEYS.stageViewPosition,
        normalizedParentJobPath,
        persistedStageViewPosition,
      );
    }
  }, [persistedStageViewPosition, isMobile, normalizedParentJobPath]);

  useEffect(() => {
    if (!isMobile) {
      storeInLocalStorage(
        LS_KEYS.mainViewVisibility,
        normalizedParentJobPath,
        persistedMainViewVisibility,
      );
    }
  }, [persistedMainViewVisibility, isMobile, normalizedParentJobPath]);

  useEffect(() => {
    storeInLocalStorage(
      LS_KEYS.treeViewWidth,
      normalizedParentJobPath,
      treeViewWidth.toString(),
    );
  }, [treeViewWidth, normalizedParentJobPath]);

  useEffect(() => {
    storeInLocalStorage(
      LS_KEYS.stageViewWidth,
      normalizedParentJobPath,
      stageViewWidth.toString(),
    );
  }, [stageViewWidth, normalizedParentJobPath]);

  useEffect(() => {
    storeInLocalStorage(
      LS_KEYS.stageViewHeight,
      normalizedParentJobPath,
      stageViewHeight.toString(),
    );
  }, [stageViewHeight, normalizedParentJobPath]);

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        isMobile,
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
