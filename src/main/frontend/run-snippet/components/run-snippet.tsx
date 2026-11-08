import "./run-snippet.scss";

import Tippy, { TippyProps } from "@tippyjs/react";
import {
  Fragment,
  ReactElement,
  RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DefaultDropdownProps } from "../../common/components/dropdown.tsx";
import InputApprovers from "../../common/components/input-approvers.tsx";
import InputStepControls from "../../common/components/input-step-controls.tsx";
import StatusIcon, {
  StageStatusIcon,
} from "../../common/components/status-icon.tsx";
import Tooltip from "../../common/components/tooltip.tsx";
import { useInputTooltip } from "../../common/components/use-input-tooltip.ts";
import { RunStatus } from "../../common/RestClient.tsx";
import LiveTotal from "../../common/utils/live-total.tsx";
import {
  PendingInput,
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { collapseTopLevelStages, expandMatrixStages } from "./utils.ts";

export default function RunSnippet({
  run,
  currentRunPath,
  runPath,
}: {
  run: RunStatus;
  /** Prefix for links to a stage, followed by the stage's id. */
  currentRunPath: string;
  /** The run's URL, including the root URL and a trailing slash. */
  runPath: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stages = useMemo(() => expandMatrixStages(run.stages), [run.stages]);
  const maxVisible = useFittingSlots(ref, stages);
  const items = collapseTopLevelStages(stages, maxVisible);
  const total = stages.length;
  const started = stages.filter((stage) => !stage.skeleton).length;
  const current = currentStage(stages);

  return (
    <div>
      <div className="pgv-run-snippet" ref={ref}>
        {items.length === 0 && <EmptySnippet />}
        {items.map((item) => {
          if (item.kind === "collapsed") {
            // Placeholders are only guesses at what's to come, so don't count those as running
            const running = item.stages.some(
              (stage) => !stage.skeleton && stage.state === Result.running,
            );

            return (
              <StagesDropdown
                key={item.id}
                stages={item.stages}
                currentRunPath={currentRunPath}
                runPath={runPath}
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
              </StagesDropdown>
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

          // A matrix's stage, which lists how it went in each of the matrix's configurations
          if (e.synthetic) {
            return (
              <StagesDropdown
                key={e.id}
                heading={e.name}
                stages={e.children}
                currentRunPath={currentRunPath}
                runPath={runPath}
              >
                <a href={currentRunPath + e.id}>
                  <StageStatusIcon stage={e} />
                </a>
              </StagesDropdown>
            );
          }

          const pendingInputs = pendingInputsOf(e);
          if (pendingInputs.length > 0) {
            return (
              <PendingInputsTooltip
                key={e.id}
                stage={e}
                pendingInputs={pendingInputs}
                runPath={runPath}
              >
                <a href={currentRunPath + e.id}>
                  <StageStatusIcon stage={e} />
                </a>
              </PendingInputsTooltip>
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
      <div className="pgv-run-snippet__summary jenkins-!-text-color-secondary">
        {started < total ? `${started} of ` : ""}
        {total} stage{total === 1 ? "" : "s"}
        {current && (
          <>
            {" · "}
            <span className="pgv-run-snippet__summary__current">
              {current.name}{" "}
              <LiveTotal
                total={current.totalDurationMillis}
                start={current.startTimeMillis}
              />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The stage the run is on, so how long it has been going can be seen without hovering over it.
 * Placeholders are only guesses at what's to come, so they're never the current stage.
 */
function currentStage(stages: StageInfo[]): StageInfo | undefined {
  return stages.find(
    (stage) =>
      !stage.skeleton &&
      (stage.state === Result.running || stage.state === Result.paused),
  );
}

/**
 * Offers to proceed with or abort each input the stage is waiting on, when hovering or focusing
 * its child. Parallel branches can each be waiting on their own input, so they're listed by the
 * stage that's waiting.
 */
function PendingInputsTooltip({
  stage,
  pendingInputs,
  runPath,
  children,
}: {
  stage: StageInfo;
  pendingInputs: PendingInput[];
  runPath: string;
  children: ReactElement;
}) {
  const { tooltipProps, hide } = useInputTooltip();

  return (
    <Tooltip
      delay={TOOLTIP_DELAY}
      {...tooltipProps}
      content={
        <div className="pgv-run-snippet__inputs">
          <div className="pgv-run-snippet__inputs__stage">{stage.name}</div>
          {pendingInputs.map((pending) => (
            <div key={pending.input.id} className="pgv-run-snippet__input">
              {pending.stageName !== stage.name && (
                <div className="jenkins-!-text-color-secondary">
                  {pending.stageName}
                </div>
              )}
              <div className="pgv-run-snippet__input__message">
                {pending.input.message}
              </div>
              <InputApprovers
                input={pending.input}
                className="jenkins-!-text-color-secondary"
              />
              <InputStepControls
                input={pending.input}
                baseUrl={`${runPath}input/${pending.input.id}/`}
                onAction={hide}
              />
            </div>
          ))}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}

/**
 * The input a stage or its nested stages are waiting on. Top-level stages come with theirs
 * gathered, while the stages of a matrix keep their nested stages to look through.
 */
function pendingInputsOf(stage: StageInfo): PendingInput[] {
  if (stage.skeleton) {
    return [];
  }
  if (stage.pendingInputs?.length) {
    return stage.pendingInputs;
  }
  const nested = (stage.children ?? []).flatMap(pendingInputsOf);
  // A matrix's stage copies one configuration's state and input, which its configurations
  // already account for
  if (stage.synthetic || stage.state !== Result.paused || !stage.inputStep) {
    return nested;
  }
  return [
    { stageId: stage.id, stageName: stage.name, input: stage.inputStep },
    ...nested,
  ];
}

/**
 * Lists the stages in a dropdown when hovering or focusing its child, linking to each one that's
 * started.
 */
function StagesDropdown({
  heading,
  stages,
  currentRunPath,
  runPath,
  children,
}: {
  heading?: string;
  stages: StageInfo[];
  currentRunPath: string;
  runPath: string;
  children: ReactElement;
}) {
  const { tooltipProps, hide } = useInputTooltip();

  return (
    <Tippy
      {...DefaultDropdownProps}
      {...tooltipProps}
      placement="top"
      offset={[0, DROPDOWN_GAP_PX]}
      // Always open upwards, scrolling if there isn't room, rather than flipping
      popperOptions={{
        modifiers: [{ name: "flip", enabled: false }],
      }}
      onShow={(instance) => {
        if (tooltipProps.onShow?.(instance) === false) {
          return false;
        }
        fitAboveReference(instance);
      }}
      content={
        <div className="jenkins-dropdown">
          {heading && (
            <div className="jenkins-dropdown__heading">{heading}</div>
          )}
          {stages.map((stage) =>
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
              <Fragment key={stage.id}>
                <a
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
                {pendingInputsOf(stage).map((pending) => (
                  <div
                    key={pending.input.id}
                    className="pgv-run-snippet__dropdown-input"
                  >
                    {pending.stageName !== stage.name && (
                      <div className="jenkins-!-text-color-secondary">
                        {pending.stageName}
                      </div>
                    )}
                    <div className="pgv-run-snippet__input__message">
                      {pending.input.message}
                    </div>
                    <InputApprovers
                      input={pending.input}
                      className="jenkins-!-text-color-secondary"
                    />
                    <InputStepControls
                      input={pending.input}
                      baseUrl={`${runPath}input/${pending.input.id}/`}
                      onAction={hide}
                    />
                  </div>
                ))}
              </Fragment>
            ),
          )}
        </div>
      }
    >
      {children}
    </Tippy>
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

function EmptySnippet() {
  return (
    <div className="pgv-run-snippet__empty">
      <div>
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <path d="M336 189L224 323L176 269.4" />
        </svg>
      </div>
      <div>
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <path d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z" />
          <ellipse cx="256" cy="350" rx="26" ry="26" />
        </svg>
      </div>
      <div>
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <path d="M320 320L192 192M192 320l128-128" />
        </svg>
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
