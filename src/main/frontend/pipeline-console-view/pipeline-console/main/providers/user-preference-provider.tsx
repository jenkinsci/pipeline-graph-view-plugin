import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
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
  defaultStageViewHeight: number;
  setDefaultStageViewHeight: Dispatch<SetStateAction<number>>;
  setStageViewPosition: (position: StageViewPosition) => void;
  setMainViewVisibility: (visibility: MainViewVisibility) => void;
  setTreeViewWidth: Dispatch<SetStateAction<number>>;
  setStageViewWidth: Dispatch<SetStateAction<number>>;
  setPersistedStageViewHeight: Dispatch<SetStateAction<number>>;
  setAutoStageViewHeight: Dispatch<SetStateAction<number>>;
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
  useOldKey: boolean = true,
): T => {
  if (typeof window === "undefined") return fallback;
  try {
    let value = window.localStorage.getItem(
      `${key}/${normalizedParentJobPath}`,
    );
    if (value === null && useOldKey) {
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

const removeFromLocalStorage = (
  key: string,
  normalizedParentJobPath: string,
) => {
  try {
    window.localStorage.removeItem(`${key}/${normalizedParentJobPath}`);
  } catch (e) {
    console.error(`Error removing localStorage key "${key}"`, e);
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

  const [treeViewWidth, setTreeViewWidth] = useState<number>(
    loadFromLocalStorage(LS_KEYS.treeViewWidth, normalizedParentJobPath, 300),
  );
  const [stageViewWidth, setStageViewWidth] = useState<number>(
    loadFromLocalStorage(LS_KEYS.stageViewWidth, normalizedParentJobPath, 600),
  );
  const [persistedStageViewHeight, setPersistedStageViewHeight] =
    useState<number>(
      loadFromLocalStorage(
        LS_KEYS.stageViewHeight,
        normalizedParentJobPath,
        0,
        // Default to auto stage height instead of using old keys.
        false,
      ),
    );
  const [autoStageViewHeight, setAutoStageViewHeight] = useState(0);
  const [defaultStageViewHeight, setDefaultStageViewHeight] =
    useState<number>(250);
  const stageViewHeight =
    persistedStageViewHeight || autoStageViewHeight || defaultStageViewHeight;

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
    if (persistedStageViewHeight === 0) {
      // Backwards compatibility: Do not store 0. We default to 0 when loading, so this is fine.
      removeFromLocalStorage(LS_KEYS.stageViewHeight, normalizedParentJobPath);
      return;
    }
    storeInLocalStorage(
      LS_KEYS.stageViewHeight,
      normalizedParentJobPath,
      persistedStageViewHeight.toString(),
    );
  }, [persistedStageViewHeight, normalizedParentJobPath]);

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

  return (
    <LayoutPreferencesContext.Provider
      value={{
        stageViewPosition,
        mainViewVisibility,
        treeViewWidth,
        stageViewWidth,
        stageViewHeight,
        defaultStageViewHeight,
        setDefaultStageViewHeight,
        setStageViewPosition,
        setMainViewVisibility,
        setTreeViewWidth,
        setStageViewWidth,
        setAutoStageViewHeight,
        setPersistedStageViewHeight,
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
