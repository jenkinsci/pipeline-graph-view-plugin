import { total, paused, started } from "./Timings";

describe("Timings", () => {
  describe("Total", () => {
    it("should format milliseconds to hours, minutes, and seconds", () => {
      // First check 359 days.
      expect(total(31_017_600_000)).toBe("11 mo");
      // And 362 days.
      expect(total(31_276_800_000)).toBe("12 mo");
      // 11.25 years - Check that if the first unit has 2 or more digits, a second unit isn't used.
      expect(total(354_780_000_000)).toBe("11 yr");
      // 9.25 years - Check that if the first unit has only 1 digit, a second unit is used.
      expect(total(291_708_000_000)).toBe("9 yr 3 mo");
      // 3 months 14 days
      expect(total(8_985_600_000)).toBe("3 mo 14 day");
      // 2 day 4 hours
      expect(total(187_200_000)).toBe("2 day 4 hr");
      // 8 hours 46 minutes
      expect(total(31_560_000)).toBe("8 hr 46 min");
      // 67 seconds -> 1 minute 7 seconds
      expect(total(67_000)).toBe("1 min 7 sec");
      // 17 seconds - Check that times less than a minute only use seconds.
      expect(total(17_000)).toBe("17 sec");
      // 1712ms -> 1.7sec
      expect(total(1_712)).toBe("1.7 sec");
      // 171ms -> 0.17sec
      expect(total(171)).toBe("0.17 sec");
      // 101ms -> 0.10sec
      expect(total(101)).toBe("0.1 sec");
      // 17ms
      expect(total(17)).toBe("17 ms");
      // 1ms
      expect(total(1)).toBe("1 ms");
    });
  });

  describe("paused", () => {
    it("should prefix the time with Queued", () => {
      expect(paused(1000)).toBe("Queued 1 sec");
      expect(paused(100)).toBe("Queued 0.1 sec");
      expect(paused(10)).toBe("Queued 10 ms");
      expect(paused(1)).toBe("Queued 1 ms");
    });
  });

  describe("started", () => {
    const now = Date.now();

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return empty string if since is 0", () => {
      expect(started(0)).toBe("");
    });

    it("should prefix the time with Started and end with ago", () => {
      expect(started(now - 1000)).toBe("Started 1 sec ago");
      expect(started(now - 100)).toBe("Started 0.1 sec ago");
      expect(started(now - 10)).toBe("Started 10 ms ago");
      expect(started(now - 1)).toBe("Started 1 ms ago");
    });
  });
});
