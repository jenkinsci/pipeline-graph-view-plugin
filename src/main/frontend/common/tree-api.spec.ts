import { renderHook, waitFor } from "@testing-library/react";
import { expect, Mock, vi } from "vitest";

import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import * as restClient from "./RestClient.tsx";
import useRunPoller from "./tree-api.ts";
import { mergeStageInfos } from "./utils/stage-merge.ts";

vi.mock("./RestClient.tsx", async () => ({
  ...(await vi.importActual("./RestClient.tsx")),
  getRunStatusFromPath: vi.fn(),
}));

describe("useRunPoller", function () {
  beforeEach(function () {
    (restClient.getRunStatusFromPath as Mock).mockReset();
  });

  it("should merge stages when not complete", async () => {
    const previous = [stage("Build"), stage("Test")];
    const current = [stage("Build", { state: Result.running, id: 42 })];

    const merged = mergeStageInfos(previous, current);
    (restClient.getRunStatusFromPath as Mock).mockImplementation(
      async (path) => {
        switch (path) {
          case "previous":
            return { stages: previous, complete: true };
          case "current":
            return { stages: current, complete: false };
        }
      },
    );
    const { result, unmount } = renderHook(() => {
      return useRunPoller({
        currentRunPath: "current",
        previousRunPath: "previous",
        interval: 10,
      });
    });
    await waitFor(() =>
      expect(result.current.run.stages).to.deep.equal(merged),
    );
    expect(restClient.getRunStatusFromPath as Mock).toHaveBeenNthCalledWith(
      1,
      "current",
    );
    expect(restClient.getRunStatusFromPath as Mock).toHaveBeenNthCalledWith(
      2,
      "previous",
    );
    // Only fetch current afterwards.
    await waitFor(() => {
      for (let i = 3; i < 20; i++) {
        expect(restClient.getRunStatusFromPath as Mock).toHaveBeenNthCalledWith(
          i,
          "current",
        );
      }
    });
    unmount();
  });

  it("should not merge stages when complete", async () => {
    const previous = [stage("Build"), stage("Test")];
    const current = [
      stage("Build"),
      // Test stage deleted
    ];
    (restClient.getRunStatusFromPath as Mock).mockImplementation(
      async (path) => {
        switch (path) {
          case "previous":
            return { stages: previous, complete: true };
          case "current":
            return { stages: current, complete: true };
        }
      },
    );
    const { result, unmount } = renderHook(() => {
      return useRunPoller({
        currentRunPath: "current",
        previousRunPath: "previous",
      });
    });
    await waitFor(() =>
      expect(result.current.run.stages).to.deep.equal(current),
    );
    unmount();
  });

  it("should ignore fetch error for previous", async () => {
    const current = [stage("Build", { state: Result.running, id: 42 })];

    (restClient.getRunStatusFromPath as Mock).mockImplementation(
      async (path) => {
        switch (path) {
          case "previous":
            throw new Error("foo");
          case "current":
            return { stages: current, complete: false };
        }
      },
    );
    const { result, unmount } = renderHook(() => {
      return useRunPoller({
        currentRunPath: "current",
        previousRunPath: "previous",
      });
    });
    await waitFor(() =>
      expect(result.current.run.stages).to.deep.equal(current),
    );
    unmount();
  });

  it("should ignore fetch error for current", async () => {
    const current = [stage("Build")];

    (restClient.getRunStatusFromPath as Mock).mockResolvedValue({
      stages: current,
      complete: true,
    });
    (restClient.getRunStatusFromPath as Mock).mockImplementationOnce(
      async () => {
        throw new Error("throw once");
      },
    );
    const { result, unmount } = renderHook(() => {
      return useRunPoller({
        currentRunPath: "current",
        interval: 100,
      });
    });
    await waitFor(() => {
      expect(result.current.run.stages).to.deep.equal(current);
      expect(restClient.getRunStatusFromPath as Mock).toHaveBeenCalledTimes(2);
    });
    unmount();
  });

  it("should update when changed", async () => {
    (restClient.getRunStatusFromPath as Mock).mockImplementation(async () => {
      return {
        raw: "first raw",
        stages: [stage("Build")],
        complete: false,
      };
    });
    const { result, unmount } = renderHook(() => {
      return useRunPoller({
        currentRunPath: "current",
        interval: 10,
      });
    });
    await waitFor(() => {
      expect(result.current.run.stages).to.deep.equal([stage("Build")]);
    });
    (restClient.getRunStatusFromPath as Mock).mockImplementation(async () => {
      return {
        raw: "second raw",
        stages: [stage("Build"), stage("Test")],
        complete: false,
      };
    });
    await waitFor(() => {
      expect(result.current.run.stages).to.deep.equal([
        stage("Build"),
        stage("Test"),
      ]);
    });
    unmount();
  });

  it("should not update when not changed", async () => {
    (restClient.getRunStatusFromPath as Mock).mockImplementation(async () => {
      return {
        raw: "first raw",
        stages: [stage("Build")],
        complete: false,
      };
    });
    const { result, unmount } = renderHook(() => {
      return useRunPoller({
        currentRunPath: "current",
        interval: 10,
      });
    });
    const getCallCount = () =>
      (restClient.getRunStatusFromPath as Mock).mock.calls.length;
    await waitFor(() => {
      expect(result.current.run.stages).to.deep.equal([stage("Build")]);
    });
    const callCount = getCallCount();
    const first = result.current.run.stages;
    await waitFor(() => {
      expect(getCallCount()).toBeGreaterThan(callCount + 2); // two poll cycles
    });
    expect(result.current.run.stages).to.equal(first);
    unmount();
  });
});

const stage = (
  name: string,
  overrides: Partial<StageInfo> = {},
): StageInfo => ({
  name,
  title: name,
  state: Result.success,
  type: "STAGE",
  children: [],
  id: name.length, // simple unique-ish id
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 0,
  agent: "",
  url: "",
  ...overrides,
});
