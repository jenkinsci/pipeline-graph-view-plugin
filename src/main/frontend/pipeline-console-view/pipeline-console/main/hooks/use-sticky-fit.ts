import { useCallback } from "react";

interface StickyFitInput {
  /** Current distance of the element from the top of the viewport. */
  top: number;
  /** The `top` the element sticks at. */
  stickyTop: number;
  /** The element's max-height once stuck. */
  stuckMaxHeight: number;
  contentHeight: number;
}

interface StickyFit {
  /** How much to shorten the element so its end stays on screen. */
  offset: number;
  /** Bottom margin that keeps the space the element takes up constant. */
  margin: number;
}

export function computeStickyFit({
  top,
  stickyTop,
  stuckMaxHeight,
  contentHeight,
}: StickyFitInput): StickyFit {
  // Capped so the stuck max-height can still be worked out from the applied
  // max-height when the element starts entirely below the fold.
  const offset = Math.min(Math.max(0, top - stickyTop), stuckMaxHeight);
  const stuckHeight = Math.min(contentHeight, stuckMaxHeight);
  const height = Math.min(contentHeight, Math.max(0, stuckMaxHeight - offset));
  return { offset, margin: stuckHeight - height };
}

/**
 * Returns a ref callback for a sticky, scrollable element. Before the page
 * has scrolled it into place the element starts lower down, so its end would
 * be below the fold; this shortens it by `--pgv-unstuck-offset` to keep the
 * end on screen. `--pgv-unstuck-margin` makes up the difference so the page
 * layout doesn't change as it scrolls, which would otherwise grow the page
 * along with the element.
 */
export function useStickyFit() {
  return useCallback((element: HTMLElement | null) => {
    if (!element) return;

    const update = () => {
      const style = getComputedStyle(element);
      const maxHeight = parseFloat(style.maxHeight);
      if (Number.isNaN(maxHeight)) return;
      const appliedOffset =
        parseFloat(style.getPropertyValue("--pgv-unstuck-offset")) || 0;
      const { offset, margin } = computeStickyFit({
        top: element.getBoundingClientRect().top,
        stickyTop: parseFloat(style.top) || 0,
        stuckMaxHeight: maxHeight + appliedOffset,
        contentHeight: element.scrollHeight,
      });
      element.style.setProperty("--pgv-unstuck-offset", `${offset}px`);
      element.style.setProperty("--pgv-unstuck-margin", `${margin}px`);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Content above the element (such as the graph) or in it can change
    // height without the page scrolling. Once the element is capped, content
    // added to it (such as an expanded group) only changes its scrollHeight.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.body);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(element, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
