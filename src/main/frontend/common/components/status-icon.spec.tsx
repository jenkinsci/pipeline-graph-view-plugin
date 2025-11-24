/** * @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";

import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { useStageProgress } from "./status-icon.tsx";

describe("StatusIcon", () => {
  describe("useStageProgress", function () {
    const now = Date.now();
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(now);
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    describe("running state", function () {
      it("should increment the progress every second", async () => {
        const { result, unmount } = renderHook(() => {
          return useStageProgress({
            ...mockStage,
            state: Result.running,
            startTimeMillis: now - 2_000,
            previousTotalDurationMillis: 20_000,
          });
        });
        expect(result.current).to.equal(10);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(15);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(20);
        await act(() => vi.advanceTimersByTime(6_000));
        expect(result.current).to.equal(50);
        unmount();
      });
      it("should stop at 99%", async () => {
        const { result, unmount } = renderHook(() => {
          return useStageProgress({
            ...mockStage,
            state: Result.running,
            startTimeMillis: now - 2_000,
            previousTotalDurationMillis: 20_000,
          });
        });
        expect(result.current).to.equal(10);
        await act(() => vi.advanceTimersByTime(16_000));
        expect(result.current).to.equal(90);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(95);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(99);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(99);
        unmount();
      });
      it("should default to 10s previous duration", async () => {
        const { result, unmount } = renderHook(() => {
          return useStageProgress({
            ...mockStage,
            state: Result.running,
            startTimeMillis: now - 1_000,
          });
        });
        expect(result.current).to.equal(10);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(20);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(30);
        unmount();
      });
      it("should handle cycling of stage object", async () => {
        const stage = {
          ...mockStage,
          state: Result.running,
          startTimeMillis: now - 1_000,
        };
        const { result, unmount, rerender } = renderHook<number, StageInfo>(
          (stage) => {
            return useStageProgress(stage);
          },
          { initialProps: stage },
        );
        expect(result.current).to.equal(10);
        // Trigger re-render half way through the interval.
        await act(() => vi.advanceTimersByTime(500));
        expect(result.current).to.equal(10);
        await act(() => {
          rerender({ ...stage });
        });
        expect(result.current).to.equal(10);
        // Only updates after the original interval passed
        await act(() => vi.advanceTimersByTime(499));
        expect(result.current).to.equal(10);
        await act(() => vi.advanceTimersByTime(1));
        expect(result.current).to.equal(20);
        // And then again when the next one passed.
        await act(() => vi.advanceTimersByTime(999));
        expect(result.current).to.equal(20);
        await act(() => vi.advanceTimersByTime(1));
        expect(result.current).to.equal(30);
        unmount();
      });
      it("should transition to 0", async () => {
        const stage = {
          ...mockStage,
          state: Result.running,
          startTimeMillis: now - 1_000,
        };
        const { result, unmount, rerender } = renderHook<number, StageInfo>(
          (stage) => {
            return useStageProgress(stage);
          },
          { initialProps: stage },
        );
        expect(result.current).to.equal(10);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(20);
        await act(() => vi.advanceTimersByTime(10_000));
        expect(result.current).to.equal(99);
        await act(() => {
          rerender({ ...stage, state: Result.success });
        });
        expect(result.current).to.equal(0);
        unmount();
      });
      it("should continue progress when waitingForInput is true", async () => {
        const { result, unmount } = renderHook(() => {
          return useStageProgress({
            ...mockStage,
            state: Result.running,
            waitingForInput: true,
            startTimeMillis: now - 2_000,
            previousTotalDurationMillis: 20_000,
          });
        });
        expect(result.current).to.equal(10);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(15);
        await act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).to.equal(20);
        unmount();
      });
    });
    describe("other states", function () {
      for (const state in Result) {
        if (state === Result.running) continue;
        it(`should return 0 for ${state}`, async () => {
          const { result, unmount } = renderHook(() => {
            return useStageProgress({
              ...mockStage,
              state: state as Result,
              startTimeMillis: now - 2_000,
              previousTotalDurationMillis: 20_000,
            });
          });
          expect(result.current).to.equal(0);
          await act(() => vi.advanceTimersByTime(1_000));
          expect(result.current).to.equal(0);
          unmount();
        });
      }
    });
  });
});

const mockStage: StageInfo = {
  name: "Build",
  state: Result.success,
  skeleton: false,
  id: 1,
  title: "Build",
  type: "STAGE",
  agent: "agent-1",
  children: [],
  pauseDurationMillis: 5000,
  startTimeMillis: 1713440000000,
  url: "",
};
