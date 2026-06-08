const STORAGE_KEY = "pgv-build-flow-preferences";

export interface BuildFlowPreferences {
  showUpstream: boolean;
  showDownstream: boolean;
  layoutDirection: "LTR" | "TTB";
  showDuration: boolean;
  showBuildNumber: boolean;
  showFullNames: boolean;
  showDescription: boolean;
  showBuildHistory: boolean;
  flattenGraph: boolean;
  autoRefresh: boolean;
  focusCurrentFlow: boolean;
}

const DEFAULT_PREFERENCES: BuildFlowPreferences = {
  showUpstream: true,
  showDownstream: true,
  layoutDirection: "LTR",
  showDuration: true,
  showBuildNumber: true,
  showFullNames: false,
  showDescription: false,
  showBuildHistory: false,
  flattenGraph: false,
  autoRefresh: true,
  focusCurrentFlow: false,
};

export function loadPreferences(): BuildFlowPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: BuildFlowPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore
  }
}
