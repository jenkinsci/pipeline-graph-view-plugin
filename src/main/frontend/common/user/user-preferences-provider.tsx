import { createContext, ReactNode, useContext, useState } from "react";

interface PipelineGraphViewPreferences {
  showNames: boolean;
  setShowNames: (val: boolean) => void;
  showDurations: boolean;
  setShowDurations: (val: boolean) => void;
  showBuildFlow: boolean;
  setShowBuildFlow: (val: boolean) => void;
}

const defaultPreferences = {
  showNames: false,
  showDurations: false,
  showBuildFlow: true,
};

const UserPreferencesContext = createContext<
  PipelineGraphViewPreferences | undefined
>(undefined);

const makeKey = (setting: string) => `pgv-graph-view.${setting}`;

export const BUILD_FLOW_LS_KEY = makeKey("showBuildFlow");
export const BUILD_FLOW_CHANGED_EVENT = "pgv-show-build-flow-changed";

const parsePreferenceValue = <T,>(
  value: string | undefined,
  fallback: T,
): T => {
  if (value === undefined) {
    return fallback;
  }
  if (typeof fallback === "boolean") {
    return (value === "true") as typeof fallback;
  }
  return value as unknown as T;
};

const loadFromLocalStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key) ?? undefined;
    return parsePreferenceValue(value, fallback);
  } catch (e) {
    console.error(`Error loading localStorage key "${key}"`, e);
  }
  return fallback;
};

const loadFromDOM = <T,>(key: string, fallback: T): T => {
  const preferencesModule = document.querySelector(
    "[data-module='user-preferences']",
  );
  const value =
    preferencesModule && "dataset" in preferencesModule
      ? (preferencesModule as HTMLElement).dataset[key]
      : undefined;
  return parsePreferenceValue(value, fallback);
};

export const UserPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const stageNamesKey = makeKey("stageNames");
  const stageDurationsKey = makeKey("stageDurations");

  const [showNames, setShowNames] = useState<boolean>(
    loadFromLocalStorage(
      stageNamesKey,
      loadFromDOM("preferenceShowStageNames", defaultPreferences.showNames),
    ),
  );
  const [showDurations, setShowDurations] = useState<boolean>(
    loadFromLocalStorage(
      stageDurationsKey,
      loadFromDOM(
        "preferenceShowStageDurations",
        defaultPreferences.showDurations,
      ),
    ),
  );
  const [showBuildFlow, setShowBuildFlow] = useState<boolean>(
    loadFromLocalStorage(BUILD_FLOW_LS_KEY, defaultPreferences.showBuildFlow),
  );

  const persistShowNames = (val: boolean) => {
    window.localStorage.setItem(stageNamesKey, String(val));
    setShowNames(val);
  };

  const persistShowDurations = (val: boolean) => {
    window.localStorage.setItem(stageDurationsKey, String(val));
    setShowDurations(val);
  };

  const persistShowBuildFlow = (val: boolean) => {
    window.localStorage.setItem(BUILD_FLOW_LS_KEY, String(val));
    setShowBuildFlow(val);
    document.dispatchEvent(
      new CustomEvent(BUILD_FLOW_CHANGED_EVENT, { detail: val }),
    );
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        showNames,
        setShowNames: persistShowNames,
        showDurations,
        setShowDurations: persistShowDurations,
        showBuildFlow,
        setShowBuildFlow: persistShowBuildFlow,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = (): PipelineGraphViewPreferences => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error(
      "useMonitorPreferences must be used within a UserPreferencesProvider",
    );
  }
  return context;
};
