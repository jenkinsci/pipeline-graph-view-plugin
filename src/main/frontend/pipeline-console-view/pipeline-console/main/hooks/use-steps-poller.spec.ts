/** * @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { Mock, vi } from "vitest";

import * as model from "../PipelineConsoleModel.tsx";
import {
  ConsoleLogData,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "../PipelineConsoleModel.tsx";
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
  getConsoleTextOffset: vi.fn(),
  getExceptionText: vi.fn().mockResolvedValue(["Error message"]),
  POLL_INTERVAL: 50,
}));

beforeEach(() => {
  (model.getRunSteps as Mock).mockResolvedValue({ steps: mockSteps });
  (model.getConsoleTextOffset as Mock).mockResolvedValue({
    consoleAnnotator: "",
    text: "log line\n",
    startByte: 0,
    endByte: 100,
  });
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

it("handles empty console log", async () => {
  (model.getConsoleTextOffset as Mock).mockResolvedValue({
    consoleAnnotator: "",
    text: "",
    startByte: 0,
    endByte: 0,
  });
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1", previousRunPath: undefined }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-2"));
  await waitFor(() =>
    expectSameStepBuffer(result.current.openStageStepBuffers.get("step-2"), {
      startByte: 0,
      endByte: 0,
      lines: [],
      consoleAnnotator: "",
      stopTailing: true,
    }),
  );

  unmount();
});

it("handles empty console log lines before and after text", async () => {
  (model.getConsoleTextOffset as Mock).mockResolvedValue({
    consoleAnnotator: "",
    text: "\nHello\n\n",
    startByte: 0,
    endByte: 0,
  });
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1", previousRunPath: undefined }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-2"));
  await waitFor(() =>
    expect(
      result.current.openStageStepBuffers.get("step-2")?.lines,
    ).to.deep.equal(["", "Hello", ""]),
  );

  unmount();
});

it("appends the exception message", async () => {
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1", previousRunPath: undefined }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-2"));
  await waitFor(() =>
    expect(
      result.current.openStageStepBuffers.get("step-2")?.lines,
    ).to.deep.equal(["log line"]),
  );
  await act(() => result.current.fetchExceptionText("step-2"));

  await waitFor(() =>
    expect(
      result.current.openStageStepBuffers.get("step-2")?.lines,
    ).to.deep.equal(["log line", "Error message"]),
  );

  unmount();
});

it("handles empty console log and exception message", async () => {
  (model.getConsoleTextOffset as Mock).mockResolvedValue({
    consoleAnnotator: "",
    text: "",
    startByte: 0,
    endByte: 0,
  });
  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1", previousRunPath: undefined }),
  );

  await waitFor(() => expect(result.current.expandedSteps).toContain("step-2"));
  await waitFor(() =>
    expect(
      result.current.openStageStepBuffers.get("step-2")?.lines,
    ).to.deep.equal([]),
  );
  await act(() => result.current.fetchExceptionText("step-2"));

  await waitFor(() =>
    expect(
      result.current.openStageStepBuffers.get("step-2")?.lines,
    ).to.deep.equal(["Error message"]),
  );

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

it("selected steps can be collapsed and remain collapsed", async () => {
  window.history.pushState({}, "", "/?selected-node=step-1&start-byte=0");

  let currentSteps = [
    { id: "step-1", title: "Step 1", stageId: "stage-1", state: "running" },
    { id: "step-2", title: "Step 2", stageId: "stage-1", state: "queued" },
  ];
  (model.getRunSteps as Mock).mockResolvedValue({ steps: currentSteps });

  const props = { currentRunPath: "/run/1" };
  const { result, unmount } = renderHook(() => useStepsPoller(props));
  await waitFor(() => expect(result.current.expandedSteps).toContain("step-1"));

  expect(result.current.expandedSteps).toContain("step-1");
  act(() => result.current.onStepToggle("step-1"));
  expect(result.current.expandedSteps).not.toContain("step-1");

  // Simulate step-1 finishing and step-2 becoming active
  currentSteps = [
    { id: "step-1", title: "Step 1", stageId: "stage-1", state: "success" },
    { id: "step-2", title: "Step 2", stageId: "stage-1", state: "running" },
  ];
  (model.getRunSteps as Mock).mockResolvedValue({ steps: currentSteps });

  await waitFor(() =>
    expect(result.current.openStageSteps).to.deep.equal(currentSteps),
  );
  expect(result.current.expandedSteps).not.toContain("step-1");

  unmount();
});

it("switches to next stage when current one finishes", async () => {
  let currentSteps = [
    { id: "s1", title: "Step 1", stageId: "stage-1", state: "running" },
    { id: "s2", title: "Step 2", stageId: "stage-2", state: "queued" },
  ];

  (model.getRunSteps as Mock).mockImplementation(() =>
    Promise.resolve({ steps: currentSteps }),
  );

  const { result, unmount } = renderHook(() =>
    useStepsPoller({ currentRunPath: "/run/1" }),
  );

  await waitFor(() => expect(result.current.openStage?.id).toBe("stage-1"));
  expect(result.current.expandedSteps).toContain("s1");

  // Simulate stage-1 finishing and stage-2 becoming active
  currentSteps = [
    { id: "s1", title: "Step 1", stageId: "stage-1", state: "success" },
    { id: "s2", title: "Step 2", stageId: "stage-2", state: "running" },
  ];
  (model.getRunSteps as Mock).mockResolvedValue({ steps: currentSteps });

  await waitFor(() => expect(result.current.openStage?.id).toBe("stage-2"));
  expect(result.current.expandedSteps).toContain("s2");

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

it("expanded steps remain expanded", async () => {
  window.history.pushState({}, "", "/?selected-node=step-1&start-byte=0");

  let currentSteps = [
    { id: "step-1", title: "Step 1", stageId: "stage-1", state: "running" },
    { id: "step-2", title: "Step 2", stageId: "stage-1", state: "queued" },
  ];
  (model.getRunSteps as Mock).mockResolvedValue({ steps: currentSteps });

  const props = { currentRunPath: "/run/1" };
  const { result, unmount } = renderHook(() => useStepsPoller(props));
  await waitFor(() => expect(result.current.expandedSteps).toContain("step-1"));

  expect(result.current.expandedSteps).toContain("step-1");
  act(() => result.current.onStepToggle("step-2"));
  expect(result.current.expandedSteps).toContain("step-1");
  expect(result.current.expandedSteps).toContain("step-2");

  // Simulate step-1 finishing and step-2 becoming active
  currentSteps = [
    { id: "step-1", title: "Step 1", stageId: "stage-1", state: "success" },
    { id: "step-2", title: "Step 2", stageId: "stage-1", state: "running" },
  ];
  (model.getRunSteps as Mock).mockResolvedValue({ steps: currentSteps });

  await waitFor(() =>
    expect(result.current.openStageSteps).to.deep.equal(currentSteps),
  );
  expect(result.current.expandedSteps).toContain("step-1");
  expect(result.current.expandedSteps).toContain("step-2");

  unmount();
});

describe("incremental log fetching", function () {
  const scenarios: Record<
    string,
    {
      clickMoreStartByte: number;
      fetchStartByte: number;
      fetchConsoleAnnotator: string;
      logData: ConsoleLogData;
      result: StepLogBufferInfo;
    }[]
  > = {
    "when starting from zero": [
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: TAIL_CONSOLE_LOG,
        fetchConsoleAnnotator: "",
        logData: {
          text: "0\n",
          startByte: 0,
          endByte: 2,
          nodeIsActive: true,
          consoleAnnotator: "0",
        },
        result: {
          startByte: 0,
          lines: ["0"],
          endByte: 2,
          consoleAnnotator: "0",
        },
      },
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: 2,
        fetchConsoleAnnotator: "0",
        logData: {
          text: "1\n",
          startByte: 2,
          endByte: 4,
          nodeIsActive: true,
          consoleAnnotator: "1",
        },
        result: {
          startByte: 0,
          lines: ["0", "1"],
          endByte: 4,
          consoleAnnotator: "1",
        },
      },
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: 4,
        fetchConsoleAnnotator: "1",
        logData: {
          text: "2\n3\n",
          startByte: 4,
          endByte: 8,
          nodeIsActive: true,
          consoleAnnotator: "3",
        },
        result: {
          startByte: 0,
          lines: ["0", "1", "2", "3"],
          endByte: 8,
          consoleAnnotator: "3",
        },
      },
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: 8,
        fetchConsoleAnnotator: "3",
        logData: {
          text: "",
          startByte: 8,
          endByte: 8,
          nodeIsActive: true,
          consoleAnnotator: "empty",
        },
        result: {
          startByte: 0,
          lines: ["0", "1", "2", "3"],
          endByte: 8,
          consoleAnnotator: "empty",
        },
      },
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: 8,
        fetchConsoleAnnotator: "empty",
        logData: {
          text: "4\n",
          startByte: 8,
          endByte: 10,
          nodeIsActive: true,
          consoleAnnotator: "4",
        },
        result: {
          startByte: 0,
          lines: ["0", "1", "2", "3", "4"],
          endByte: 10,
          consoleAnnotator: "4",
        },
      },
    ],
    "when skipping ahead": [
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: TAIL_CONSOLE_LOG,
        fetchConsoleAnnotator: "",
        logData: {
          text: "0\n",
          startByte: 1_000_000,
          endByte: 1_000_002,
          nodeIsActive: true,
          consoleAnnotator: "0",
        },
        result: {
          startByte: 1_000_000,
          lines: ["0"],
          endByte: 1_000_002,
          consoleAnnotator: "0",
        },
      },
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: 1_000_002,
        fetchConsoleAnnotator: "0",
        logData: {
          text: "1\n",
          startByte: 1_000_002,
          endByte: 1_000_004,
          nodeIsActive: true,
          consoleAnnotator: "1",
        },
        result: {
          startByte: 1_000_000,
          lines: ["0", "1"],
          endByte: 1_000_004,
          consoleAnnotator: "1",
        },
      },
    ],
    "when skipping ahead and clicking fetch more": [
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: TAIL_CONSOLE_LOG,
        fetchConsoleAnnotator: "",
        logData: {
          text: "0\n",
          startByte: 1_000_000,
          endByte: 1_000_002,
          nodeIsActive: true,
          consoleAnnotator: "0",
        },
        result: {
          startByte: 1_000_000,
          lines: ["0"],
          endByte: 1_000_002,
          consoleAnnotator: "0",
        },
      },
      {
        clickMoreStartByte: 1_000_000 - model.LOG_FETCH_SIZE,
        fetchStartByte: 1_000_000 - model.LOG_FETCH_SIZE,
        fetchConsoleAnnotator: "",
        logData: {
          text: "xxx\n0\n",
          startByte: 1_000_000 - model.LOG_FETCH_SIZE,
          endByte: 1_000_002,
          nodeIsActive: true,
          consoleAnnotator: "x",
        },
        result: {
          startByte: 1_000_000 - model.LOG_FETCH_SIZE,
          lines: ["xxx", "0"],
          endByte: 1_000_002,
          consoleAnnotator: "x",
        },
      },
      {
        clickMoreStartByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
        fetchStartByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
        fetchConsoleAnnotator: "",
        logData: {
          text: "yyy\nxxx\n0\n",
          startByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
          endByte: 1_000_002,
          nodeIsActive: true,
          consoleAnnotator: "y",
        },
        result: {
          startByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
          lines: ["yyy", "xxx", "0"],
          endByte: 1_000_002,
          consoleAnnotator: "y",
        },
      },
    ],
    "when skipping ahead and clicking fetch more while polling": [
      {
        clickMoreStartByte: TAIL_CONSOLE_LOG,
        fetchStartByte: TAIL_CONSOLE_LOG,
        fetchConsoleAnnotator: "",
        logData: {
          text: "0\n",
          startByte: 1_000_000,
          endByte: 1_000_002,
          nodeIsActive: true,
          consoleAnnotator: "0",
        },
        result: {
          startByte: 1_000_000,
          lines: ["0"],
          endByte: 1_000_002,
          consoleAnnotator: "0",
        },
      },
      {
        clickMoreStartByte: 1_000_000 - model.LOG_FETCH_SIZE,
        fetchStartByte: 1_000_000 - model.LOG_FETCH_SIZE,
        fetchConsoleAnnotator: "",
        logData: {
          text: "xxx\n0\n",
          startByte: 1_000_000 - model.LOG_FETCH_SIZE,
          endByte: 1_000_002,
          nodeIsActive: true,
          consoleAnnotator: "x",
        },
        result: {
          startByte: 1_000_000 - model.LOG_FETCH_SIZE,
          lines: ["xxx", "0"],
          endByte: 1_000_002,
          consoleAnnotator: "x",
        },
      },
      {
        clickMoreStartByte: model.TAIL_CONSOLE_LOG,
        fetchStartByte: 1_000_002,
        fetchConsoleAnnotator: "x",
        logData: {
          text: "1\n",
          startByte: 1_000_002,
          endByte: 1_000_004,
          nodeIsActive: true,
          consoleAnnotator: "1",
        },
        result: {
          startByte: 1_000_000 - model.LOG_FETCH_SIZE,
          lines: ["xxx", "0", "1"],
          endByte: 1_000_004,
          consoleAnnotator: "1",
        },
      },
      {
        clickMoreStartByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
        fetchStartByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
        fetchConsoleAnnotator: "",
        logData: {
          text: "yyy\nxxx\n0\n1\n",
          startByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
          endByte: 1_000_004,
          nodeIsActive: false,
          consoleAnnotator: "y",
        },
        result: {
          startByte: 1_000_000 - model.LOG_FETCH_SIZE * 2,
          lines: ["yyy", "xxx", "0", "1"],
          endByte: 1_000_004,
          consoleAnnotator: "y",
          stopTailing: true,
        },
      },
    ],
  };

  for (const [name, evolutions] of Object.entries(scenarios)) {
    it(name, async function () {
      const props = { currentRunPath: "/run/1" };

      const firstEvolution = evolutions.shift()!;
      (model.getConsoleTextOffset as Mock).mockImplementation(
        (stepId, startByte, consoleAnnotator) => {
          expect(stepId).to.equal("step-2");
          expect(startByte).to.equal(firstEvolution.fetchStartByte);
          expect(consoleAnnotator).to.equal(
            firstEvolution.fetchConsoleAnnotator,
          );
          return Promise.resolve(firstEvolution.logData);
        },
      );

      const { result, unmount } = renderHook(() => useStepsPoller(props));
      await waitFor(() =>
        expect(result.current.expandedSteps).toContain("step-2"),
      );
      await waitFor(() =>
        expectSameStepBuffer(
          result.current.openStageStepBuffers.get("step-2"),
          firstEvolution.result,
        ),
      );

      for (const evolution of evolutions) {
        (model.getConsoleTextOffset as Mock).mockImplementation(
          (stepId, startByte, consoleAnnotator) => {
            expect(stepId).to.equal("step-2");
            expect(startByte).to.equal(evolution.fetchStartByte);
            expect(consoleAnnotator).to.equal(evolution.fetchConsoleAnnotator);
            return Promise.resolve(evolution.logData);
          },
        );
        result.current.onMoreConsoleClick(
          "step-2",
          evolution.clickMoreStartByte,
        );
        await waitFor(() => {
          expectSameStepBuffer(
            result.current.openStageStepBuffers.get("step-2"),
            evolution.result,
          );
        });
      }

      unmount();
    });
  }
});

function expectSameStepBuffer(a?: StepLogBufferInfo, b?: StepLogBufferInfo) {
  // Ignore lastFetched timestamp when comparing two buffers.
  expect({ ...a, lastFetched: 0 }).to.deep.equal({ ...b, lastFetched: 0 });
}
