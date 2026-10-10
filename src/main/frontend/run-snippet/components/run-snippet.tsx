import "./run-snippet.scss";

import Tippy, { TippyProps } from "@tippyjs/react";
import { RefObject, useLayoutEffect, useRef, useState } from "react";

import { DefaultDropdownProps } from "../../common/components/dropdown.tsx";
import StatusIcon, {
  StageStatusIcon,
} from "../../common/components/status-icon.tsx";
import Tooltip from "../../common/components/tooltip.tsx";
import { RunStatus } from "../../common/RestClient.tsx";
import LiveTotal from "../../common/utils/live-total.tsx";
import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { collapseTopLevelStages } from "./utils.ts";

export default function RunSnippet({
  run,
  currentRunPath,
}: {
  run: RunStatus;
  currentRunPath: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const maxVisible = useFittingSlots(ref, run.stages);
  const items = collapseTopLevelStages(run.stages, maxVisible);
  const total = run.stages.length;
  const started = run.stages.filter((stage) => !stage.skeleton).length;

  return (
    <div>
      <div className="pgv-run-snippet" ref={ref}>
        {items.length === 0 && <div className="pgv-run-snippet__empty" />}
        {items.map((item) => {
          if (item.kind === "collapsed") {
            // Placeholders are only guesses at what's to come, so don't count those as running
            const running = item.stages.some(
              (stage) => !stage.skeleton && stage.state === Result.running,
            );

            return (
              <Tippy
                key={item.id}
                {...DefaultDropdownProps}
                trigger="mouseenter focus"
                placement="top"
                offset={[0, DROPDOWN_GAP_PX]}
                // Always open upwards, scrolling if there isn't room, rather than flipping
                popperOptions={{
                  modifiers: [{ name: "flip", enabled: false }],
                }}
                onShow={fitAboveReference}
                // Interactive tippies are put next to their reference by default, where the
                // history column would clip them
                appendTo={document.body}
                content={
                  <div className="jenkins-dropdown">
                    {item.stages.map((stage) =>
                      stage.skeleton ? (
                        // Not started yet, so there's nothing to link to
                        <button
                          key={stage.id}
                          type="button"
                          className="jenkins-dropdown__item pgv-run-snippet__stage"
                          disabled
                        >
                          <div className="jenkins-dropdown__item__icon">
                            <StatusIcon status={stage.state} skeleton />
                          </div>
                          {stage.name}
                        </button>
                      ) : (
                        <a
                          key={stage.id}
                          className="jenkins-dropdown__item pgv-run-snippet__stage"
                          href={currentRunPath + stage.id}
                        >
                          <div className="jenkins-dropdown__item__icon">
                            <StageStatusIcon stage={stage} />
                          </div>
                          {stage.name}
                          <span className="jenkins-dropdown__item__badge pgv-run-snippet__duration">
                            <LiveTotal
                              total={stage.totalDurationMillis}
                              start={stage.startTimeMillis}
                            />
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                }
              >
                <button
                  type="button"
                  className={
                    "pgv-run-snippet__collapsed" +
                    (running ? " pgv-run-snippet__collapsed--running" : "")
                  }
                >
                  {running && (
                    // Pulses like the running status icon's dot
                    <span className="pgv-run-snippet__collapsed__pulse" />
                  )}
                  {item.hiddenCount}
                </button>
              </Tippy>
            );
          }

          const e = item.stage;

          // Placeholders come from the previous run, so there's no duration or stage to link to yet
          if (e.skeleton) {
            return (
              <Tooltip content={e.name} key={e.id} delay={TOOLTIP_DELAY}>
                <span>
                  <StatusIcon status={e.state} skeleton />
                </span>
              </Tooltip>
            );
          }

          return (
            <Tooltip
              delay={TOOLTIP_DELAY}
              content={
                <div style={{ textAlign: "center" }}>
                  <div>{e.name}</div>
                  <div className={"jenkins-!-text-color-secondary"}>
                    <LiveTotal
                      total={e.totalDurationMillis}
                      start={e.startTimeMillis}
                    />
                  </div>
                </div>
              }
              key={e.id}
            >
              <a href={currentRunPath + e.id}>
                <StageStatusIcon stage={e} />
              </a>
            </Tooltip>
          );
        })}
      </div>
      <div
        className="jenkins-!-text-color-secondary"
        style={{ fontSize: "12px" }}
      >
        {started < total ? `${started} of ` : ""}
        {total} stage{total === 1 ? "" : "s"}
      </div>
    </div>
  );
}

// Wait briefly before showing a stage's tooltip, so they don't flash up while moving across
// the snippet, but hide it straight away
const TOOLTIP_DELAY: [number, number] = [50, 0];

// Keeps long lists of hidden stages compact, scrolling past this
const MAX_DROPDOWN_HEIGHT_PX = 215;

// Same gap between a dropdown and its badge as the stage tooltips, which use Tippy's default
const DROPDOWN_GAP_PX = 10;

// Space to leave between a dropdown and the top of the window
const VIEWPORT_MARGIN_PX = 8;

/**
 * Caps the dropdown's height, and to the space above its reference so it scrolls rather than
 * running off the top of the window. Its theme scrolls when it's taller than its max-height.
 */
function fitAboveReference(
  instance: Parameters<NonNullable<TippyProps["onShow"]>>[0],
) {
  const box = instance.popper.querySelector<HTMLElement>(".tippy-box");
  if (box) {
    const space =
      instance.reference.getBoundingClientRect().top -
      DROPDOWN_GAP_PX -
      VIEWPORT_MARGIN_PX;
    box.style.maxHeight = `${Math.min(MAX_DROPDOWN_HEIGHT_PX, Math.max(0, space))}px`;
  }
}

// A kept stage with hidden stages either side takes 3 slots
const MIN_SLOTS = 3;

// Match the icon size and gap in run-snippet.scss
const GAP_REM = 0.125;
const SLOT_WIDTH_REM = 1.375 + GAP_REM;

/**
 * How many icon slots fit in the element's width. The history column can be narrower than all
 * the stages and clips its overflow, so the stages need to collapse to what fits instead. How wide
 * the column can grow is left to the page.
 */
function useFittingSlots(
  ref: RefObject<HTMLElement | null>,
  stages: StageInfo[],
): number {
  // Start with every stage, so the page sees how much room they'd take if given it
  const [slots, setSlots] = useState(Infinity);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      // n icons only need n - 1 gaps, so count the missing trailing gap as space
      const fitting = Math.floor(
        (element.clientWidth + GAP_REM * rem) / (SLOT_WIDTH_REM * rem),
      );
      setSlots(Math.max(MIN_SLOTS, fitting));
    };

    // Measured afresh when the stages change too, as a slot dropped to fit one set of
    // markers might not be needed for the next
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, stages]);

  // Slots assume every item is one icon wide, but collapsed markers can be wider, so if what's
  // rendered still overflows, try again with one fewer. The initial render is meant to show
  // every stage, so it's left alone.
  useLayoutEffect(() => {
    const element = ref.current;
    if (
      element &&
      Number.isFinite(slots) &&
      slots > MIN_SLOTS &&
      element.scrollWidth > element.clientWidth
    ) {
      setSlots(slots - 1);
    }
  }, [ref, slots, stages]);

  return slots;
}
