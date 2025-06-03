import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface PipelineGraphViewPreferences {
  showNames: boolean;
  setShowNames: (val: boolean) => void;
  showDurations: boolean;
  setShowDurations: (val: boolean) => void;
}

const defaultPreferences = {
  showNames: false,
  showDurations: false,
};

const UserPreferencesContext = createContext<
  PipelineGraphViewPreferences | undefined
>(undefined);

const makeKey = (setting: string) => `pgv-graph-view.${setting}`;

const loadFromLocalStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      if (typeof fallback === "boolean") {
        return (value === "true") as typeof fallback;
      }
      return value as unknown as T;
    }
  } catch (e) {
    console.error(`Error loading localStorage key "${key}"`, e);
  }
  return fallback;
};

export const UserPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const stageNamesKey = makeKey("stageNames");
  const stageDurationsKey = makeKey("stageDurations");

  const [showNames, setShowNames] = useState<boolean>(
    loadFromLocalStorage(stageNamesKey, defaultPreferences.showNames),
  );
  const [showDurations, setShowDurations] = useState<boolean>(
    loadFromLocalStorage(stageDurationsKey, defaultPreferences.showDurations),
  );

  useEffect(() => {
    window.localStorage.setItem(stageNamesKey, String(showNames));
  }, [showNames]);

  useEffect(() => {
    window.localStorage.setItem(stageDurationsKey, String(showDurations));
  }, [showDurations]);

  return (
    <UserPreferencesContext.Provider
      value={{
        showNames,
        setShowNames,
        showDurations,
        setShowDurations,
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
      "useMonitorPreferences must be used within a MonitorPreferencesProvider",
    );
  }
  return context;
};
