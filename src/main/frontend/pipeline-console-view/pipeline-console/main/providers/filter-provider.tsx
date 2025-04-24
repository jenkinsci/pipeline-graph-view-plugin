import React, { createContext, useContext, useState, ReactNode } from "react";

interface FilterContextType {
  checkedStatuses: Record<string, boolean>;
  toggleStatus: (key: string) => void;
  resetStatuses: () => void;
  search: string;
  setSearch: (value: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const defaultStatuses = {
  running: true,
  success: true,
  failure: true,
  unstable: true,
  aborted: true,
  skipped: true,
  not_built: true,
};

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [checkedStatuses, setCheckedStatuses] =
    useState<Record<string, boolean>>(defaultStatuses);
  const [search, setSearch] = useState("");

  const toggleStatus = (key: string) => {
    setCheckedStatuses((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetStatuses = () => {
    setCheckedStatuses({ ...defaultStatuses });
  };

  return (
    <FilterContext.Provider
      value={{
        checkedStatuses,
        toggleStatus,
        resetStatuses,
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
