import { createContext, ReactNode, useContext, useState } from "react";

import { Result } from "../../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

interface FilterContextType {
  visibleStatuses: Result[];
  toggleStatus: (key: Result) => void;
  resetStatuses: () => void;
  allVisible: boolean;
  search: string;
  setSearch: (value: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const defaultStatuses: Result[] = [
  Result.running,
  Result.success,
  Result.failure,
  Result.unstable,
  Result.aborted,
  Result.skipped,
  Result.not_built,
];

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [visibleStatuses, setVisibleStatuses] = useState<Result[]>([]);
  const [search, setSearch] = useState("");

  const toggleStatus = (key: Result) => {
    if (visibleStatuses.includes(key as Result)) {
      setVisibleStatuses(visibleStatuses.filter((s) => s !== (key as Result)));
    } else {
      setVisibleStatuses([...visibleStatuses, key as Result]);
    }
  };

  const resetStatuses = () => {
    setVisibleStatuses([]);
  };

  return (
    <FilterContext.Provider
      value={{
        visibleStatuses:
          visibleStatuses.length > 0 ? visibleStatuses : defaultStatuses,
        toggleStatus,
        resetStatuses,
        allVisible:
          (visibleStatuses.length > 0 ? visibleStatuses : defaultStatuses)
            .length === defaultStatuses.length,
        search,
        setSearch,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
};
