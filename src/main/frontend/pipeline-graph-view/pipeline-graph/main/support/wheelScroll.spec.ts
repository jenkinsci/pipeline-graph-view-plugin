import {
  computeWheelScroll,
  isZoomModifierPressed,
  ScrollGeometry,
  WheelScrollInput,
} from "./wheelScroll.ts";

const WIDE_GRAPH: ScrollGeometry = {
  viewportWidth: 1000,
  viewportHeight: 200,
  contentWidth: 3000,
  contentHeight: 150,
  positionX: 0,
  positionY: 25,
};

function wheel(overrides: Partial<WheelScrollInput>): WheelScrollInput {
  return {
    deltaX: 0,
    deltaY: 0,
    deltaMode: WheelEvent.DOM_DELTA_PIXEL,
    shiftKey: false,
    ...overrides,
  };
}

describe("computeWheelScroll", () => {
  it("scrolls horizontally with a horizontal trackpad swipe", () => {
    expect(computeWheelScroll(wheel({ deltaX: 120 }), WIDE_GRAPH)).toEqual({
      positionX: -120,
      positionY: 25,
    });
  });

  it("scrolls horizontally with shift and a vertical wheel", () => {
    expect(
      computeWheelScroll(wheel({ deltaY: 120, shiftKey: true }), WIDE_GRAPH),
    ).toEqual({ positionX: -120, positionY: 25 });
  });

  it("leaves a vertical wheel to the page when the graph fits vertically", () => {
    expect(computeWheelScroll(wheel({ deltaY: 120 }), WIDE_GRAPH)).toBeNull();
  });

  it("scrolls vertically when the graph is taller than the viewport", () => {
    const tall = { ...WIDE_GRAPH, contentHeight: 800, positionY: 0 };
    expect(computeWheelScroll(wheel({ deltaY: 120 }), tall)).toEqual({
      positionX: 0,
      positionY: -120,
    });
  });

  it("stops at the end of the graph", () => {
    expect(
      computeWheelScroll(wheel({ deltaX: 500 }), {
        ...WIDE_GRAPH,
        positionX: -1800,
      }),
    ).toEqual({ positionX: -2000, positionY: 25 });
  });

  it("leaves the event to the page once the graph is at its edge", () => {
    expect(
      computeWheelScroll(wheel({ deltaX: 100 }), {
        ...WIDE_GRAPH,
        positionX: -2000,
      }),
    ).toBeNull();
    expect(computeWheelScroll(wheel({ deltaX: -100 }), WIDE_GRAPH)).toBeNull();
  });

  it("does not move a graph that fits the viewport", () => {
    const small = { ...WIDE_GRAPH, contentWidth: 600, positionX: 200 };
    expect(computeWheelScroll(wheel({ deltaX: 100 }), small)).toBeNull();
  });

  it("converts line-based deltas to pixels", () => {
    expect(
      computeWheelScroll(
        wheel({
          deltaY: 3,
          shiftKey: true,
          deltaMode: WheelEvent.DOM_DELTA_LINE,
        }),
        WIDE_GRAPH,
      ),
    ).toEqual({ positionX: -48, positionY: 25 });
  });

  it("converts page-based deltas to the viewport size", () => {
    expect(
      computeWheelScroll(
        wheel({ deltaX: 1, deltaMode: WheelEvent.DOM_DELTA_PAGE }),
        WIDE_GRAPH,
      ),
    ).toEqual({ positionX: -1000, positionY: 25 });
  });
});

describe("isZoomModifierPressed", () => {
  it("requires Control or Meta", () => {
    expect(isZoomModifierPressed([])).toBe(false);
    expect(isZoomModifierPressed(["Shift"])).toBe(false);
    expect(isZoomModifierPressed(["Control"])).toBe(true);
    expect(isZoomModifierPressed(["Meta"])).toBe(true);
  });
});
