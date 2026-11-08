import { describe, expect, it } from "vitest";

import { computeStickyFit } from "./use-sticky-fit.ts";

const stuck = { stickyTop: 70, stuckMaxHeight: 800 };

describe("computeStickyFit", () => {
  it("leaves a stuck element alone", () => {
    expect(
      computeStickyFit({ ...stuck, top: 70, contentHeight: 2000 }),
    ).toEqual({ offset: 0, margin: 0 });
  });

  it("shortens an overflowing element by how far it is below where it sticks", () => {
    expect(
      computeStickyFit({ ...stuck, top: 370, contentHeight: 2000 }),
    ).toEqual({ offset: 300, margin: 300 });
  });

  it("only adds the margin the shortening takes away", () => {
    // 600 of content fits once stuck; 500 fits now, so 100 is made up.
    expect(
      computeStickyFit({ ...stuck, top: 370, contentHeight: 600 }),
    ).toEqual({ offset: 300, margin: 100 });
  });

  it("adds no margin when the content fits either way", () => {
    expect(
      computeStickyFit({ ...stuck, top: 370, contentHeight: 300 }),
    ).toEqual({ offset: 300, margin: 0 });
  });

  it("keeps the space taken up constant as the page scrolls", () => {
    for (const contentHeight of [300, 600, 2000]) {
      const footprints = [70, 200, 370, 1000].map((top) => {
        const { offset, margin } = computeStickyFit({
          ...stuck,
          top,
          contentHeight,
        });
        const height = Math.min(contentHeight, Math.max(0, 800 - offset));
        return height + margin;
      });
      expect(new Set(footprints).size).toBe(1);
    }
  });

  it("does not count being pushed up past where it sticks", () => {
    expect(
      computeStickyFit({ ...stuck, top: 20, contentHeight: 2000 }),
    ).toEqual({ offset: 0, margin: 0 });
  });
});
