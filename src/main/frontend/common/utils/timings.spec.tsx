/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { vi } from "vitest";

import { I18NContext, LocalizedMessageKey, Messages } from "../i18n/index.ts";
import { Paused, Started, Total } from "./timings.tsx";

describe("Timings", () => {
  const translations = new Messages(
    {
      [LocalizedMessageKey.year]: "{0} yr",
      [LocalizedMessageKey.month]: "{0} mo",
      [LocalizedMessageKey.day]: "{0} day",
      [LocalizedMessageKey.hour]: "{0} hr",
      [LocalizedMessageKey.minute]: "{0} min",
      [LocalizedMessageKey.second]: "{0} sec",
      [LocalizedMessageKey.millisecond]: "{0} ms",
      [LocalizedMessageKey.startedAgo]: "Started {0} ago",
    },
    "en",
  );

  function process(child: any) {
    return render(
      <I18NContext.Provider value={translations}>{child}</I18NContext.Provider>,
    );
  }

  describe("Total", () => {
    function getTotal(ms: number) {
      return process(<Total ms={ms} />);
    }

    it("should format milliseconds to hours, minutes, and seconds", () => {
      // First check 359 days.
      expect(getTotal(31_017_600_000).getByText("11 mo")).toBeInTheDocument();
      // And 362 days.
      expect(getTotal(31_276_800_000).getByText("12 mo")).toBeInTheDocument();
      // 11.25 years - Check that if the first unit has 2 or more digits, a second unit isn't used.
      expect(getTotal(354_780_000_000).getByText("11 yr")).toBeInTheDocument();
      // 9.25 years - Check that if the first unit has only 1 digit, a second unit is used.
      expect(
        getTotal(291_708_000_000).getByText("9 yr 3 mo"),
      ).toBeInTheDocument();
      // 3 months 14 days
      expect(
        getTotal(8_985_600_000).getByText("3 mo 14 day"),
      ).toBeInTheDocument();
      // 2 day 4 hours
      expect(getTotal(187_200_000).getByText("2 day 4 hr")).toBeInTheDocument();
      // 8 hours 46 minutes
      expect(getTotal(31_560_000).getByText("8 hr 46 min")).toBeInTheDocument();
      // 67 seconds -> 1 minute 7 seconds
      expect(getTotal(67_000).getByText("1 min 7 sec")).toBeInTheDocument();
      // 17 seconds - Check that times less than a minute only use seconds.
      expect(getTotal(17_000).getByText("17 sec")).toBeInTheDocument();
      // 1712ms -> 1.7sec
      expect(getTotal(1_712).getByText("1.7 sec")).toBeInTheDocument();
      // 171ms -> 0.17sec
      expect(getTotal(171).getByText("0.17 sec")).toBeInTheDocument();
      // 101ms -> 0.10sec
      expect(getTotal(101).getByText("0.1 sec")).toBeInTheDocument();
      // 17ms
      expect(getTotal(17).getByText("17 ms")).toBeInTheDocument();
      // 1ms
      expect(getTotal(1).getByText("1 ms")).toBeInTheDocument();
    });
  });

  describe("paused", () => {
    function getPaused(since: number) {
      return process(<Paused since={since} />);
    }

    it("should prefix the time with Queued", () => {
      expect(getPaused(1000).getByText("Queued 1 sec")).toBeInTheDocument();
      expect(getPaused(100).getByText("Queued 0.1 sec")).toBeInTheDocument();
      expect(getPaused(10).getByText("Queued 10 ms")).toBeInTheDocument();
      expect(getPaused(1).getByText("Queued 1 ms")).toBeInTheDocument();
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
      return process(<Started since={since} />);
    }

    it("should return empty element if since is 0", () => {
      expect(getStarted(0).container.innerHTML).toBe("");
    });

    it("should prefix the time with Started and end with ago", () => {
      expect(
        getStarted(now - 1000).getByText("Started 1 sec ago"),
      ).toBeInTheDocument();
      expect(
        getStarted(now - 100).getByText("Started 0.1 sec ago"),
      ).toBeInTheDocument();
      expect(
        getStarted(now - 10).getByText("Started 10 ms ago"),
      ).toBeInTheDocument();
      expect(
        getStarted(now - 1).getByText("Started 1 ms ago"),
      ).toBeInTheDocument();
    });
  });
});
