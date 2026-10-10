import "./run-snippet.scss";

import Tippy from "@tippyjs/react";
import { RefObject, useLayoutEffect, useRef, useState } from "react";

import { DefaultDropdownProps } from "../../common/components/dropdown.tsx";
import StatusIcon from "../../common/components/status-icon.tsx";
import Tooltip from "../../common/components/tooltip.tsx";
import { RunStatus } from "../../common/RestClient.tsx";
import LiveTotal from "../../common/utils/live-total.tsx";
import { Result } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { collapseTopLevelStages } from "./utils.ts";

export default function RunSnippet({
  run,
  currentRunPath,
}: {
  run: RunStatus;
  currentRunPath: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const maxVisible = useFittingSlots(ref);
  const items = collapseTopLevelStages(run.stages, maxVisible);
  const total = run.stages.length;
  const started = run.stages.filter((stage) => !stage.skeleton).length;

  return (
    <div>
      <div className="pgv-run-snippet" ref={ref}>
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
                          className="jenkins-dropdown__item"
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
                          className="jenkins-dropdown__item"
                          href={currentRunPath + stage.id}
                        >
                          <div className="jenkins-dropdown__item__icon">
                            <StatusIcon status={stage.state} />
                          </div>
                          {stage.name}
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
              <Tooltip content={e.name} key={e.id}>
                <span>
                  <StatusIcon status={e.state} skeleton />
                </span>
              </Tooltip>
            );
          }

          return (
            <Tooltip
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
                <StatusIcon status={e.state} />
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
function useFittingSlots(ref: RefObject<HTMLElement | null>): number {
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

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

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
  }, [ref, slots]);

  return slots;
}
