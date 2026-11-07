import { RefObject, useEffect } from "react";
import { useTransformContext } from "react-zoom-pan-pinch";

const LINE_HEIGHT_PX = 16;

export interface WheelScrollInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
}

export interface ScrollGeometry {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  positionX: number;
  positionY: number;
}

/**
 * Wheel gestures zoom only with Ctrl or Meta held. Trackpad pinches arrive as
 * wheel events with ctrlKey set, so they keep zooming too.
 */
export const isZoomModifierPressed = (keys: string[]) =>
  keys.includes("Control") || keys.includes("Meta");

function toPixels(delta: number, deltaMode: number, pageSize: number) {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * LINE_HEIGHT_PX;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * pageSize;
  return delta;
}

function scrollAxis(
  position: number,
  delta: number,
  viewportSize: number,
  contentSize: number,
) {
  if (contentSize <= viewportSize) return position;
  return Math.min(0, Math.max(viewportSize - contentSize, position - delta));
}

/**
 * Where a wheel event scrolls the graph to, mimicking a native overflow
 * container: an axis only moves while the scaled graph overflows it, and it
 * stops at the graph's edges. Shift turns a vertical wheel into horizontal
 * scrolling, as browsers do for mice without a horizontal wheel.
 *
 * Returns null when the graph cannot move, so the event can scroll the page.
 */
export function computeWheelScroll(
  event: WheelScrollInput,
  geometry: ScrollGeometry,
): { positionX: number; positionY: number } | null {
  let { deltaX, deltaY } = event;
  if (event.shiftKey && deltaX === 0) {
    deltaX = deltaY;
    deltaY = 0;
  }
  deltaX = toPixels(deltaX, event.deltaMode, geometry.viewportWidth);
  deltaY = toPixels(deltaY, event.deltaMode, geometry.viewportHeight);

  const positionX = scrollAxis(
    geometry.positionX,
    deltaX,
    geometry.viewportWidth,
    geometry.contentWidth,
  );
  const positionY = scrollAxis(
    geometry.positionY,
    deltaY,
    geometry.viewportHeight,
    geometry.contentHeight,
  );

  if (positionX === geometry.positionX && positionY === geometry.positionY) {
    return null;
  }
  return { positionX, positionY };
}

/**
 * Scrolls the graph with the mouse wheel or trackpad. Must be used inside a
 * TransformWrapper whose wheel zoom requires a modifier key.
 */
export function useWheelScroll() {
  const instance = useTransformContext();

  useEffect(() => {
    const attach = (wrapper: HTMLElement) => {
      const onWheel = (event: WheelEvent) => {
        if (event.ctrlKey || event.metaKey) return;
        const content = instance.contentComponent;
        if (!content) return;
        const { scale, positionX, positionY } = instance.state;
        const next = computeWheelScroll(event, {
          viewportWidth: wrapper.clientWidth,
          viewportHeight: wrapper.clientHeight,
          contentWidth: content.offsetWidth * scale,
          contentHeight: content.offsetHeight * scale,
          positionX,
          positionY,
        });
        if (!next) return;
        event.preventDefault();
        instance.setState(scale, next.positionX, next.positionY);
      };
      wrapper.addEventListener("wheel", onWheel, { passive: false });
      return () => wrapper.removeEventListener("wheel", onWheel);
    };

    if (instance.wrapperComponent) {
      return attach(instance.wrapperComponent);
    }
    let detach: (() => void) | undefined;
    const unsubscribe = instance.onInit((ctx) => {
      if (ctx.instance.wrapperComponent) {
        detach = attach(ctx.instance.wrapperComponent);
      }
    });
    return () => {
      unsubscribe();
      detach?.();
    };
  }, [instance]);
}

/**
 * Stops wheel events within the element from scrolling the page, for when the
 * element covers it.
 */
export function useContainWheel(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const onWheel = (event: WheelEvent) => event.preventDefault();
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref, enabled]);
}
