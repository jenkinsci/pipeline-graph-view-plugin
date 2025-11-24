import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// Ensure a functional localStorage implementation for tests that persist user preferences.
if (
  !("localStorage" in window) ||
  typeof window.localStorage?.getItem !== "function" ||
  typeof window.localStorage?.setItem !== "function"
) {
  const store: Record<string, string> = {};
  const localStoragePolyfill = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
  // @ts-expect-error override for test environment
  window.localStorage = localStoragePolyfill;
}

const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
}));

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
