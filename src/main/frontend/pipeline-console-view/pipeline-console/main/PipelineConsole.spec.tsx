/** * @vitest-environment jsdom */

import { act, render, screen, waitFor } from "@testing-library/react";
import { TextEncoder } from "util";
import { vi } from "vitest";

import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { useStepsPoller } from "./hooks/use-steps-poller.ts";
import PipelineConsole from "./PipelineConsole.tsx";
import { FilterProvider } from "./providers/filter-provider.tsx";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";

(globalThis as any).TextEncoder = TextEncoder;

vi.mock("./hooks/use-steps-poller.ts", () => ({
  useStepsPoller: vi.fn(),
}));

vi.mock("./providers/user-preference-provider.tsx", async () => ({
  ...(await vi.importActual("./providers/user-preference-provider.tsx")),
  useLayoutPreferences: vi.fn(),
}));

vi.mock("./ConsoleLogStream.tsx", () => ({
  default: ({ logBuffer }: any) => (
    <div data-testid="console-log-stream">
      {logBuffer.lines.map((line: string, i: number) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  ),
}));

vi.mock("../../../common/user/user-permission-provider.tsx", () => ({
  useUserPermissions: () => ({ canConfigure: false }),
}));

vi.mock("../../../common/RestClient.tsx", async () => {
  const actual: any = await vi.importActual("../../../common/RestClient.tsx");
  return {
    ...actual,
    getConsoleBuildOutput: vi
      .fn()
      .mockResolvedValue(
        [
          "Started by user Administrator",
          "Obtained Jenkinsfile from git",
          "[Pipeline] Start of Pipeline",
          "[Pipeline] node",
          "Still waiting to schedule task",
          "Waiting for next available executor on 'w01'",
        ].join("\n"),
      ),
  };
});

const placeholderStage: StageInfo = {
  id: 2,
  name: "System Generated",
  title: "System Generated",
  state: Result.queued,
  type: "PIPELINE_START",
  children: [],
  synthetic: true,
  placeholder: true,
  causeOfBlockage: "Waiting for next available executor on ‘w01’",
  pauseDurationMillis: 0,
  startTimeMillis: Date.now(),
  agent: "w01",
  url: "",
};

beforeEach(() => {
  document.body.innerHTML =
    "<header></header>" +
    '<div class="jenkins-app-bar"></div>' +
    '<div id="console-pipeline-root" data-current-run-path="/jenkins/job/x/1/"></div>' +
    '<div id="console-pipeline-overflow-root"></div>';

  if (!(globalThis as any).IntersectionObserver) {
    (globalThis as any).IntersectionObserver = class {
      observe = () => {};
      unobserve = () => {};
      disconnect = () => {};
      takeRecords = () => [];
      root = null;
      rootMargin = "";
      thresholds = [];
    };
  }

  (useLayoutPreferences as any).mockReturnValue({
    stageViewPosition: "top",
    mainViewVisibility: "both",
    setStageViewPosition: () => {},
    setMainViewVisibility: () => {},
    stageViewWidth: 0,
    stageViewHeight: 0,
    setStageViewWidth: () => {},
    setStageViewHeight: () => {},
    isMobile: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PipelineConsole — queued placeholder fallback", () => {
  it("renders StageDetails + NoStageStepsFallback when only stage is a queued placeholder", async () => {
    (useStepsPoller as any).mockReturnValue({
      complete: false,
      tailLogs: false,
      scrollToTail: () => {},
      startTailingLogs: () => {},
      stopTailingLogs: () => {},
      openStage: placeholderStage,
      openStageSteps: [],
      stepBuffers: new Map(),
      expandedSteps: [],
      stages: [placeholderStage],
      handleStageSelect: () => {},
      onStepToggle: () => {},
      fetchLogText: async () => ({ lines: [], startByte: 0, endByte: 0 }),
      fetchExceptionText: async () => ({ lines: [], startByte: 0, endByte: 0 }),
      loading: false,
    });

    await act(async () => {
      render(
        <FilterProvider>
          <PipelineConsole />
        </FilterProvider>,
      );
    });

    expect(
      screen.getAllByText(/Waiting for next available executor on/).length,
    ).toBeGreaterThan(0);

    await waitFor(() =>
      expect(
        screen.getByText(/Obtained Jenkinsfile from git/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Still waiting to schedule task/),
    ).toBeInTheDocument();
  });

  it("renders the structured graph when the placeholder is no longer queued", async () => {
    (useStepsPoller as any).mockReturnValue({
      complete: false,
      tailLogs: false,
      scrollToTail: () => {},
      startTailingLogs: () => {},
      stopTailingLogs: () => {},
      openStage: { ...placeholderStage, state: Result.running },
      openStageSteps: [],
      stepBuffers: new Map(),
      expandedSteps: [],
      stages: [{ ...placeholderStage, state: Result.running }],
      handleStageSelect: () => {},
      onStepToggle: () => {},
      fetchLogText: async () => ({ lines: [], startByte: 0, endByte: 0 }),
      fetchExceptionText: async () => ({ lines: [], startByte: 0, endByte: 0 }),
      loading: false,
    });

    await act(async () => {
      render(
        <FilterProvider>
          <PipelineConsole />
        </FilterProvider>,
      );
    });

    // The fallback's canned console output must NOT render in the running case.
    expect(
      screen.queryByText(/Obtained Jenkinsfile from git/),
    ).not.toBeInTheDocument();
  });
});
