import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

const IntersectionObserverMock = vi.fn(function IntersectionObserverMock() {
  return {
    disconnect: vi.fn(),
    observe: vi.fn(),
  };
});

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
