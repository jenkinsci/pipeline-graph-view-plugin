/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { vi } from "vitest";

import { Paused, Started, Total } from "./timings.tsx";

describe("Timings", () => {
  describe("Total", () => {
    function getTotal(ms: number) {
      return render(<Total ms={ms} />);
    }

    it("should format milliseconds to hours, minutes, and seconds", () => {
      // First check 359 days.
      expect(getTotal(31_017_600_000).getByText("11 mths")).toBeInTheDocument();
      // And 362 days.
      expect(getTotal(31_276_800_000).getByText("12 mths")).toBeInTheDocument();
      // 11.25 years - Check that if the first unit has 2 or more digits, a second unit isn't used.
      expect(getTotal(354_780_000_000).getByText("11y")).toBeInTheDocument();
      // 9.25 years - Check that if the first unit has only 1 digit, a second unit is used.
      expect(getTotal(291_708_000_000).getByText("9y 3m")).toBeInTheDocument();
      // 3 months 14 days
      expect(getTotal(8_985_600_000).getByText("3m 14d")).toBeInTheDocument();
      // 2 day 4 hours
      expect(getTotal(187_200_000).getByText("2d 4h")).toBeInTheDocument();
      // 8 hours 46 minutes
      expect(getTotal(31_560_000).getByText("8h 46m")).toBeInTheDocument();
      // 67 seconds -> 1 minute 7 seconds
      expect(getTotal(67_000).getByText("1m 7s")).toBeInTheDocument();
      // 17 seconds - Check that times less than a minute only use seconds.
      expect(getTotal(17_000).getByText("17s")).toBeInTheDocument();
      // 1712ms -> 1.7sec
      expect(getTotal(1_712).getByText("1.7s")).toBeInTheDocument();
      // 171ms -> 0.17sec
      expect(getTotal(171).getByText("0.17s")).toBeInTheDocument();
      // 101ms -> 0.1sec
      expect(getTotal(101).getByText("0.1s")).toBeInTheDocument();
      // 17ms
      expect(getTotal(17).getByText("17ms")).toBeInTheDocument();
      // 1ms
      expect(getTotal(1).getByText("1ms")).toBeInTheDocument();
    });
  });

  describe("paused", () => {
    function getPaused(since: number) {
      return render(<Paused since={since} />);
    }

    it("should prefix the time with Queued", () => {
      expect(getPaused(1000).getByText("Queued 1s")).toBeInTheDocument();
      expect(getPaused(100).getByText("Queued 0.1s")).toBeInTheDocument();
      expect(getPaused(10).getByText("Queued 10ms")).toBeInTheDocument();
      expect(getPaused(1).getByText("Queued 1ms")).toBeInTheDocument();
    });
  });

  describe("started", () => {
    const now = Date.now();

    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function getStarted(since: number) {
      return render(<Started since={since} />);
    }

    it("should return empty element if since is 0", () => {
      expect(getStarted(0).container.innerHTML).toBe("");
    });

    it("should prefix the time with Started and end with ago", () => {
      expect(
        getStarted(now - 1000).getByText("Started 1s ago"),
      ).toBeInTheDocument();
      expect(
        getStarted(now - 100).getByText("Started 0.1s ago"),
      ).toBeInTheDocument();
      expect(
        getStarted(now - 10).getByText("Started 10ms ago"),
      ).toBeInTheDocument();
      expect(
        getStarted(now - 1).getByText("Started 1ms ago"),
      ).toBeInTheDocument();
    });
  });
});
