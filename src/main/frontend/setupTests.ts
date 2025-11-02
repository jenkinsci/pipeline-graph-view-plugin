import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
}));

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
