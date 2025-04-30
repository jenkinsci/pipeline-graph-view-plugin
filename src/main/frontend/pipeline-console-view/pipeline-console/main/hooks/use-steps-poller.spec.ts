/** * @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { Mock, vi } from "vitest";

import * as model from "../PipelineConsoleModel.tsx";
import { useStepsPoller } from "./use-steps-poller.ts";

const mockSteps = [
  {
    id: "step-1",
    title: "Step 1",
    stageId: "stage-1",
    state: "success",
  },
  {
    id: "step-2",
    title: "Step 2",
    stageId: "stage-2",
    state: "running",
  },
];

const mockStages = [
  { id: "stage-1", name: "Stage 1", children: [] },
  { id: "stage-2", name: "Stage 2", children: [] },
];

vi.mock("../../../../common/tree-api.ts", () => ({
  __esModule: true,
  default: vi.fn(() => ({ run: { stages: mockStages, complete: false } })),
}));

vi.mock("../PipelineConsoleModel.tsx", async () => ({
  ...(await vi.importActual("../PipelineConsoleModel.tsx")),
  getRunSteps: vi.fn(),
  getConsoleTextOffset: vi.fn().mockResolvedValue({
    text: "log line",
    startByte: 0,
    endByte: 100,
  }),
}));

beforeEach(() => {
  (model.getRunSteps as Mock).mockResolvedValue(mockSteps);
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  vi.clearAllMocks();
});

it("selects default step if URL param is missing", async () => {
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1", previousRunPath: undefined }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-2"));

  const { openStage, expandedSteps } = result.current;

  expect(openStage?.id).toBe("stage-2");
  expect(expandedSteps).toContain("step-2");

  unmount();
});

it("selects the step from URL on initial load", async () => {
  window.history.pushState({}, "", "/?selected-node=step-1&start-byte=0");
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1", previousRunPath: undefined }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-1"));

  const { openStage, expandedSteps } = result.current;

  expect(openStage?.id).toBe("stage-1");
  expect(expandedSteps).toContain("step-1");

  unmount();
});

it("switches to next stage when current one finishes", async () => {
  let currentSteps = [
    { id: "s1", title: "Step 1", stageId: "stage-1", state: "running" },
    { id: "s2", title: "Step 2", stageId: "stage-2", state: "queued" },
  ];

  (model.getRunSteps as Mock).mockImplementation(() =>
    Promise.resolve(currentSteps),
  );

  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1" }),
  );

  await waitFor(() => expect(result.current.openStage?.id).toBe("stage-1"));

  // Simulate stage-1 finishing and stage-2 becoming active
  currentSteps = [
    { id: "s1", title: "Step 1", stageId: "stage-1", state: "success" },
    { id: "s2", title: "Step 2", stageId: "stage-2", state: "running" },
  ];
  (model.getRunSteps as Mock).mockResolvedValue(currentSteps);

  await waitFor(() => expect(result.current.openStage?.id).toBe("stage-1"));

  expect(result.current.expandedSteps).toContain("s1");

  unmount();
});

it("expands and collapses step when toggled", async () => {
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1" }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-2"));

  act(() => result.current.onStepToggle("step-2"));
  expect(result.current.expandedSteps).not.toContain("step-2");

  act(() => result.current.onStepToggle("step-2"));
  expect(result.current.expandedSteps).toContain("step-2");

  unmount();
});
