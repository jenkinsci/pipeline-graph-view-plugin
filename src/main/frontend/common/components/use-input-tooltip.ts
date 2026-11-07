import type { TippyProps } from "@tippyjs/react";
import { useMemo, useRef } from "react";
import type { Instance } from "tippy.js";

const FOCUSABLE = "a[href], button:not([disabled])";

/**
 * Props for a tooltip holding input step controls, plus a callback to hide it once a control is
 * used.
 *
 * The tooltip is appended to the body so the graph's and history column's overflow can't clip it,
 * which puts its controls outside the page's tab order. So when keyboard focus reaches the stage,
 * focus is moved into the tooltip, and tabbing past either end or pressing Escape closes it and
 * puts focus back on the stage.
 */
export function useInputTooltip(): {
  tooltipProps: Partial<TippyProps>;
  hide: () => void;
} {
  const instanceRef = useRef<Instance>(undefined);
  const listening = useRef(new WeakSet<Instance>());
  const openedByKeyboard = useRef(false);
  // Returning focus to the stage would otherwise open the tooltip again
  const ignoreNextFocus = useRef(false);

  return useMemo(() => {
    const stageControl = (instance: Instance) =>
      instance.reference.matches(FOCUSABLE)
        ? (instance.reference as HTMLElement)
        : instance.reference.querySelector<HTMLElement>(FOCUSABLE);

    const close = (instance: Instance) => {
      const focusWasInside = instance.popper.contains(document.activeElement);
      instance.hide();
      if (focusWasInside) {
        ignoreNextFocus.current = true;
        stageControl(instance)?.focus();
      }
    };

    const onKeyDown = (instance: Instance, event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(instance);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = Array.from(
        instance.popper.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      const leaving = event.shiftKey
        ? document.activeElement === focusable[0]
        : document.activeElement === focusable[focusable.length - 1];
      if (leaving) {
        event.preventDefault();
        close(instance);
      }
    };

    const tooltipProps: Partial<TippyProps> = {
      interactive: true,
      trigger: "mouseenter focusin",
      appendTo: document.body,
      onTrigger: (_instance, event) => {
        // A mouse click focuses the stage too, which shouldn't move focus away from it
        openedByKeyboard.current =
          event.type === "focusin" &&
          (event.target as HTMLElement).matches(":focus-visible");
      },
      onShow: () => {
        if (ignoreNextFocus.current) {
          ignoreNextFocus.current = false;
          return false;
        }
      },
      // Set up on mount rather than creation, as a stage's tooltip usually exists before it pauses
      onMount: (instance) => {
        instanceRef.current = instance;
        if (!listening.current.has(instance)) {
          listening.current.add(instance);
          instance.popper.addEventListener("keydown", (event) =>
            onKeyDown(instance, event),
          );
        }
        if (openedByKeyboard.current) {
          instance.popper.querySelector<HTMLElement>(FOCUSABLE)?.focus();
        }
      },
    };

    return {
      tooltipProps,
      hide: () => {
        if (instanceRef.current) {
          close(instanceRef.current);
        }
      },
    };
  }, []);
}
