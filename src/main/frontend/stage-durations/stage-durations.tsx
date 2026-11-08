import "./stage-durations.scss";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import StatusIcon, {
  StageStatusIcon,
} from "../common/components/status-icon.tsx";
import Tooltip from "../common/components/tooltip.tsx";
import {
  LocalizedMessageKey,
  useLocale,
  useMessages,
} from "../common/i18n/index.ts";
import useRunPoller from "../common/tree-api.ts";
import LiveTotal from "../common/utils/live-total.tsx";
import { exact, humanise } from "../common/utils/timings.tsx";
import { RunInfo } from "../multi-pipeline-graph-view/multi-pipeline-graph/main/MultiPipelineGraphModel.ts";
import startPollingRunsStatus from "../multi-pipeline-graph-view/multi-pipeline-graph/main/support/startPollingRunsStatus.ts";
import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { expandMatrixStages } from "../run-snippet/components/utils.ts";
import Sparkline from "./sparkline.tsx";
import {
  baseline,
  findStep,
  isFaster,
  isSlower,
  MIN_SAMPLES,
  stageNames,
  Step,
  SUSTAINED_BUILDS,
  Usual,
  usualBefore,
  usualDuration,
} from "./utils.ts";

/** How many builds the table can show. */
export const BUILD_COUNTS = [10, 25] as const;

// Builds loaded beyond the ones shown, so a change that started near the oldest build shown still
// has builds before it to compare with
const HISTORY_BUILDS = 10;

// Up to this many stages the table fits on screen, so there's nothing to filter
export const FILTER_FROM_STAGES = 12;

interface Options {
  builds: number;
  filter: string;
  changedOnly: boolean;
  /** The changed stage the table is narrowed down to. */
  stage?: string;
}

function readOptions(): Options {
  const params = new URLSearchParams(window.location.search);
  const builds = Number(params.get("builds"));
  return {
    builds: BUILD_COUNTS.find((count) => count === builds) ?? BUILD_COUNTS[0],
    filter: params.get("filter") ?? "",
    changedOnly: params.get("changed") === "true",
    stage: params.get("stage") ?? undefined,
  };
}

/** Keeps the options in the address, so a focused view can be shared or bookmarked. */
function writeOptions({ builds, filter, changedOnly, stage }: Options) {
  const url = new URL(window.location.href);
  const set = (name: string, value: string | undefined) =>
    value ? url.searchParams.set(name, value) : url.searchParams.delete(name);
  set("builds", builds === BUILD_COUNTS[0] ? undefined : String(builds));
  set("filter", filter || undefined);
  set("changed", changedOnly ? "true" : undefined);
  set("stage", stage);
  window.history.replaceState(null, "", url);
}

/**
 * How long each stage took in recent builds, a row per stage with the builds oldest to newest, so a
 * stage that has started taking longer stands out against the builds before it.
 */
export default function StageDurations({ jobPath }: { jobPath: string }) {
  const [options, setOptions] = useState<Options>(readOptions);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [stagesByRun, setStagesByRun] = useState<Record<string, StageInfo[]>>(
    {},
  );

  useEffect(
    () =>
      startPollingRunsStatus(
        jobPath,
        setRuns,
        (err) => console.error(err),
        10_000,
        options.builds + HISTORY_BUILDS,
      ),
    [jobPath, options.builds],
  );

  // Builds' stages arrive one request at a time, so they're gathered up and passed on together
  const pending = useRef<Record<string, StageInfo[]>>({});
  const frame = useRef<number>(undefined);
  const onStages = useCallback((id: string, stages: StageInfo[]) => {
    pending.current[id] = stages;
    frame.current ??= requestAnimationFrame(() => {
      const arrived = pending.current;
      pending.current = {};
      frame.current = undefined;
      setStagesByRun((previous) => ({ ...previous, ...arrived }));
    });
  }, []);
  useEffect(
    () => () => {
      if (frame.current !== undefined) {
        cancelAnimationFrame(frame.current);
      }
    },
    [],
  );

  useEffect(() => writeOptions(options), [options]);

  const onOptions = useCallback((changed: Partial<Options>) => {
    setOptions((previous) => ({ ...previous, ...changed }));
  }, []);

  return (
    <>
      {runs.map((run) => (
        <RunStages
          key={run.id}
          run={run}
          jobPath={jobPath}
          onStages={onStages}
        />
      ))}
      <StageDurationsView
        runs={runs}
        stagesByRun={stagesByRun}
        jobPath={jobPath}
        options={options}
        onOptions={onOptions}
      />
    </>
  );
}

/** Keeps a build's stages up to date while it runs. */
function RunStages({
  run,
  jobPath,
  onStages,
}: {
  run: RunInfo;
  jobPath: string;
  onStages: (id: string, stages: StageInfo[]) => void;
}) {
  const { run: status, loading } = useRunPoller({
    currentRunPath: jobPath + run.id + "/",
    currentRunStartTime: run.timestamp,
  });

  useEffect(() => {
    if (!loading) {
      onStages(run.id, status.stages);
    }
  }, [onStages, run.id, status.stages, loading]);

  return null;
}

interface Build {
  run: RunInfo;
  /** Undefined until the build's stages have loaded. */
  stages?: StageInfo[];
}

type Change = "slower" | "much-slower" | "faster";

interface StageCellInfo {
  stage?: StageInfo;
  change?: Change;
  /** Whether this build is where the stage's shading starts, so it gets an arrow. */
  marked?: boolean;
  /** What the stage was compared with, when it's shaded. */
  compareWith?: number;
  /** The build the stage changed in, when it's compared with how long it took before the change. */
  since?: RunInfo;
}

interface StageRow {
  name: string;
  /** The stage in each build shown, oldest first. */
  cells: StageCellInfo[];
  /** The stage's usual duration in each build shown, oldest first. */
  usual: Array<number | undefined>;
  step?: Step;
}

/**
 * @param runs the builds, newest first, as the builds list shows them, including the earlier builds
 *   loaded to compare with
 */
export function StageDurationsView({
  runs,
  stagesByRun,
  jobPath,
  options = readOptions(),
  onOptions = () => {},
}: {
  runs: RunInfo[];
  stagesByRun: Record<string, StageInfo[]>;
  jobPath: string;
  options?: Options;
  onOptions?: (changed: Partial<Options>) => void;
}) {
  const messages = useMessages();
  const [hovered, setHovered] = useState<number>();
  const scroller = useRef<HTMLDivElement>(null);

  // Every build loaded, oldest first
  const history: Build[] = useMemo(
    () =>
      [...runs].reverse().map((run) => {
        const stages = stagesByRun[run.id];
        return { run, stages: stages && expandMatrixStages(stages) };
      }),
    [runs, stagesByRun],
  );
  const offset = Math.max(0, history.length - options.builds);
  const builds = useMemo(() => history.slice(offset), [history, offset]);

  const rows: StageRow[] = useMemo(() => {
    const names = stageNames(
      builds.flatMap((build) => (build.stages ? [build.stages] : [])).reverse(),
    );
    const byName = history.map(
      (build) =>
        new Map((build.stages ?? []).map((stage) => [stage.name, stage])),
    );
    return names.map((name) => {
      const stages = byName.map((stages) => stages.get(name));
      const usual = stages.map(usualDuration);
      const step = findStep(usual);
      const cells: StageCellInfo[] = stages
        .slice(offset)
        .map((stage, shown) => {
          const index = offset + shown;
          const since = step && index >= step.start;
          const compareWith = since ? step.usual : usualBefore(usual, index);
          let change = changeOf(usual[index], compareWith);
          // The strongest shading is kept for a change that has lasted, so a one-off doesn't
          // outshine it
          if (!since && change === "much-slower") {
            change = "slower";
          }
          return {
            stage,
            change,
            marked: change && (!since || index === step.start),
            compareWith: change && compareWith?.median,
            since: change && since ? history[step.start].run : undefined,
          };
        });
      return { name, cells, usual: usual.slice(offset), step };
    });
  }, [history, builds, offset]);

  const loaded = history.every((build) => build.stages);
  const hasRuns = runs.length > 0;

  // Fits the table into the window below it, so its header row stays in view as it scrolls. The
  // controls and changes above it come and go, so it's measured again after every render and
  // whenever the page around it changes size.
  const fit = useCallback(() => {
    const element = scroller.current;
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY;
      element.style.maxHeight = `max(20rem, ${window.innerHeight - top - 16}px)`;
    }
  }, []);
  useLayoutEffect(fit);
  useEffect(() => {
    const element = scroller.current;
    if (!element) {
      return;
    }
    window.addEventListener("resize", fit);
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(fit);
    observer?.observe(element.parentElement ?? element);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener("resize", fit);
      observer?.disconnect();
    };
  }, [fit, hasRuns]);

  // Opens on the newest builds, which are on the right, along with the median and trend when
  // there's room for them beside a few builds
  useEffect(() => {
    const element = scroller.current;
    const headings = element?.querySelectorAll("thead th");
    if (!element || !headings || !loaded || builds.length === 0) {
      return;
    }
    const names = headings[0] as HTMLElement;
    const newest = headings[builds.length] as HTMLElement;
    const room = element.clientWidth - names.offsetWidth;
    const summary =
      element.scrollWidth - (newest.offsetLeft + newest.offsetWidth);
    const newestRight = newest.offsetLeft + newest.offsetWidth;
    element.scrollLeft =
      summary + newest.offsetWidth * 3 <= room
        ? element.scrollWidth
        : newestRight - element.clientWidth;
  }, [loaded, builds.length]);

  if (runs.length === 0) {
    return (
      <p className="jenkins-!-text-color-secondary">
        {messages.format(LocalizedMessageKey.noBuilds)}
      </p>
    );
  }

  const filtering = rows.length > FILTER_FROM_STAGES;
  const filter = filtering ? options.filter.trim().toLocaleLowerCase() : "";
  // Only a stage that's still listed as changed can be pressed, so it can always be let go of
  const focused = rows.some((row) => row.name === options.stage && row.step)
    ? options.stage
    : undefined;
  // A pressed change shows just that stage, whatever the filter
  const visibleRows = rows.filter((row) =>
    focused
      ? row.name === focused
      : (!filter || row.name.toLocaleLowerCase().includes(filter)) &&
        (!filtering || !options.changedOnly || row.step),
  );
  const narrowed = visibleRows.length < rows.length;

  const totals = builds.map(({ run }) =>
    !run.building &&
    (run.result === Result.success || run.result === Result.unstable)
      ? run.duration
      : undefined,
  );

  const column = (index: number) => ({
    onMouseEnter: () => setHovered(index),
    onMouseLeave: () => setHovered(undefined),
    className: index === hovered ? "pgv-stage-durations--hovered" : undefined,
  });

  const toolbar = (
    <Toolbar
      filtering={filtering}
      options={options}
      onOptions={onOptions}
      moreBuilds={runs.length > BUILD_COUNTS[0]}
    />
  );
  const controls = document.getElementById("stage-durations-controls");

  return (
    <div className="pgv-stage-durations">
      {controls ? createPortal(toolbar, controls) : toolbar}

      <Changes
        rows={rows}
        history={history}
        loaded={loaded}
        filtering={filtering}
        changedOnly={options.changedOnly}
        onChangedOnly={(changedOnly) => onOptions({ changedOnly })}
        focused={focused}
        onFocus={(name) =>
          onOptions({ stage: focused === name ? undefined : name })
        }
      />

      <div role="status" className="pgv-stage-durations__visually-hidden">
        {narrowed &&
          messages.format(LocalizedMessageKey.stageDurationsShowing, {
            0: visibleRows.length,
            1: rows.length,
          })}
      </div>

      <div className="pgv-stage-durations__scroller" ref={scroller}>
        <table
          className={
            "jenkins-table jenkins-table--small" +
            (builds.length < 5 ? " pgv-stage-durations__table--few" : "")
          }
        >
          <thead>
            <tr>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsStage)}
              </th>
              {builds.map(({ run }, index) => (
                <th key={run.id} scope="col" {...column(index)}>
                  <BuildHeading run={run} jobPath={jobPath} />
                </th>
              ))}
              <th scope="col" className="pgv-stage-durations__summary">
                {messages.format(LocalizedMessageKey.stageDurationsMedian)}
              </th>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsTrend)}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.name}>
                <th scope="row">
                  <span className="pgv-stage-durations__name">
                    <span className="pgv-user-specified-text" title={row.name}>
                      {row.name}
                    </span>
                    {row.step && (
                      <StepBadge
                        step={row.step}
                        run={history[row.step.start].run}
                        jobPath={jobPath}
                      />
                    )}
                  </span>
                </th>
                {builds.map((build, index) => {
                  const cell = column(index);
                  const info = row.cells[index];
                  return (
                    <td
                      key={build.run.id}
                      {...cell}
                      className={[
                        cell.className,
                        info.change &&
                          `pgv-stage-durations__cell--${info.change}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <StageCell
                        loaded={build.stages !== undefined}
                        buildName={build.run.displayName}
                        info={info}
                        stagePath={
                          jobPath + build.run.id + "/stages?selected-node="
                        }
                      />
                    </td>
                  );
                })}
                <td className="pgv-stage-durations__summary">
                  <Median durations={row.usual} />
                </td>
                <td>
                  <Sparkline
                    values={row.usual}
                    step={
                      row.step && {
                        ...row.step,
                        start: Math.max(0, row.step.start - offset),
                      }
                    }
                  />
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && loaded && (
              <tr>
                <td
                  colSpan={builds.length + 3}
                  className="pgv-stage-durations__no-match"
                >
                  {messages.format(
                    rows.length > 0
                      ? LocalizedMessageKey.stageDurationsNoMatch
                      : LocalizedMessageKey.stageDurationsNoStages,
                  )}
                </td>
              </tr>
            )}
            <tr className="pgv-stage-durations__total">
              <th scope="row">
                {messages.format(LocalizedMessageKey.stageDurationsTotal)}
              </th>
              {builds.map(({ run }, index) => (
                <td key={run.id} {...column(index)}>
                  <BuildTotal run={run} counted={totals[index] !== undefined} />
                </td>
              ))}
              <td className="pgv-stage-durations__summary">
                <Median durations={totals} />
              </td>
              <td>
                <Sparkline values={totals} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Legend rows={rows} count={builds.length} />
    </div>
  );
}

/** Narrows the stages down by name and picks how many builds to show. */
function Toolbar({
  filtering,
  options,
  onOptions,
  moreBuilds,
}: {
  filtering: boolean;
  options: Options;
  onOptions: (changed: Partial<Options>) => void;
  moreBuilds: boolean;
}) {
  const messages = useMessages();

  if (!filtering && !moreBuilds) {
    return null;
  }

  return (
    <div className="pgv-stage-durations__toolbar">
      {filtering && (
        <div className="jenkins-search pgv-stage-durations__filter">
          <div className="jenkins-search__icon">
            <svg viewBox="0 0 512 512" aria-hidden="true">
              <path
                d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="32"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeMiterlimit="10"
                strokeWidth="32"
                d="M338.29 338.29L448 448"
              />
            </svg>
          </div>
          <input
            type="search"
            className="jenkins-input jenkins-search__input"
            placeholder={messages.format(
              LocalizedMessageKey.stageDurationsFilter,
            )}
            aria-label={messages.format(
              LocalizedMessageKey.stageDurationsFilter,
            )}
            value={options.filter}
            onChange={(event) => onOptions({ filter: event.target.value })}
          />
        </div>
      )}
      {moreBuilds && (
        <div className="jenkins-select pgv-stage-durations__builds">
          <select
            className="jenkins-select__input"
            aria-label={messages.format(
              LocalizedMessageKey.stageDurationsShowBuilds,
            )}
            value={options.builds}
            onChange={(event) =>
              onOptions({ builds: Number(event.target.value) })
            }
          >
            {BUILD_COUNTS.map((count) => (
              <option key={count} value={count}>
                {messages.format(LocalizedMessageKey.stageDurationsLastBuilds, {
                  0: count,
                })}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function Median({ durations }: { durations: Array<number | undefined> }) {
  const value = baseline(durations);
  return value === undefined ? null : (
    <span className="pgv-stage-durations__duration">
      <Duration ms={value} />
    </span>
  );
}

// Below this, durations get a tenth of a second, so neighbouring builds and the change between
// them read the same as the numbers they're worked out from
const TENTHS_BELOW_MILLIS = 10_000;

/** How long something took, to a tenth of a second when it's short. */
export function formatDuration(ms: number, locale: string): string {
  if (ms >= 100 && ms < TENTHS_BELOW_MILLIS) {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "second",
      unitDisplay: "narrow",
      maximumFractionDigits: 1,
    }).format(ms / 1000);
  }
  return humanise(ms, locale);
}

function Duration({ ms }: { ms: number }) {
  return <>{formatDuration(ms, useLocale())}</>;
}

/** The change from one duration to another as a signed percentage. */
export function percentChange(after: number, before: number): string {
  if (before === 0) {
    return "";
  }
  const percent = Math.round((after / before - 1) * 100);
  return (percent > 0 ? "+" : "") + percent + "%";
}

const STATUS_LABELS: Partial<Record<Result, LocalizedMessageKey>> = {
  [Result.failure]: LocalizedMessageKey.statusFailure,
  [Result.unstable]: LocalizedMessageKey.statusUnstable,
  [Result.aborted]: LocalizedMessageKey.statusAborted,
  [Result.skipped]: LocalizedMessageKey.statusSkipped,
  [Result.paused]: LocalizedMessageKey.statusPaused,
  [Result.running]: LocalizedMessageKey.statusRunning,
  [Result.not_built]: LocalizedMessageKey.statusNotBuilt,
};

function useStatusLabel(): (result: Result) => string | undefined {
  const messages = useMessages();
  return (result) => {
    const key = STATUS_LABELS[result];
    return key && messages.format(key);
  };
}

function BuildHeading({ run, jobPath }: { run: RunInfo; jobPath: string }) {
  const locale = useLocale();
  const statusLabel = useStatusLabel();
  const title = [
    run.displayName,
    statusLabel(run.result),
    exact(run.timestamp, locale),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <a
      href={jobPath + run.id + "/"}
      className="pgv-stage-durations__build"
      title={title}
    >
      {run.result !== Result.success && <StatusIcon status={run.result} />}
      <span className="pgv-user-specified-text">{run.displayName}</span>
    </a>
  );
}

function BuildTotal({ run, counted }: { run: RunInfo; counted: boolean }) {
  const messages = useMessages();
  if (run.building) {
    return (
      <span className="pgv-stage-durations__duration">
        <LiveTotal total={undefined} start={run.timestamp} />
      </span>
    );
  }
  const total = (
    <span
      className={
        "pgv-stage-durations__duration" +
        (counted ? "" : " pgv-stage-durations__duration--not-counted")
      }
      tabIndex={counted ? undefined : 0}
    >
      <Duration ms={run.duration} />
    </span>
  );
  if (counted) {
    return total;
  }
  return (
    <Tooltip
      content={messages.format(LocalizedMessageKey.stageDurationsNotCounted)}
    >
      {total}
    </Tooltip>
  );
}

const StageCell = memo(function StageCell({
  loaded,
  buildName,
  info,
  stagePath,
}: {
  loaded: boolean;
  buildName: string;
  info: StageCellInfo;
  stagePath: string;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const statusLabel = useStatusLabel();
  const { stage, change, marked, compareWith, since } = info;

  if (!loaded) {
    return <span className="pgv-stage-durations__loading" />;
  }

  if (!stage) {
    return (
      <span
        className="pgv-stage-durations__missing"
        title={messages.format(LocalizedMessageKey.stageDurationsNotRun)}
      >
        <span aria-hidden="true">–</span>
        <span className="pgv-stage-durations__visually-hidden">
          {messages.format(LocalizedMessageKey.stageDurationsNotRun)}
        </span>
      </span>
    );
  }

  const skipped = stage.state === Result.skipped;
  const status =
    stage.state !== Result.success ? statusLabel(stage.state) : undefined;
  const duration = usualDuration(stage);

  const showsDuration = !skipped && !stage.skeleton;
  // The name is the link's own text, so a running stage's ticking duration is part of it
  const content = (
    <a href={stagePath + stage.id} className="pgv-stage-durations__stage">
      <span className="pgv-stage-durations__visually-hidden">
        {[buildName, stage.name, status].filter(Boolean).join(", ")}
        {showsDuration && ","}
      </span>{" "}
      {stage.state !== Result.success && !skipped && (
        <span className="pgv-stage-durations__icon" aria-hidden="true">
          <StageStatusIcon stage={stage} />
        </span>
      )}
      {marked && (
        <span className="pgv-stage-durations__arrow" aria-hidden="true">
          {change === "faster" ? "▼" : "▲"}
        </span>
      )}
      {skipped ? (
        <span className="pgv-stage-durations__missing" aria-hidden="true">
          –
        </span>
      ) : (
        showsDuration && (
          <span className="pgv-stage-durations__duration">
            {stage.totalDurationMillis !== undefined &&
            !isInProgress(stage.state) ? (
              <Duration ms={stage.totalDurationMillis} />
            ) : (
              <LiveTotal
                total={stage.totalDurationMillis}
                start={stage.startTimeMillis}
              />
            )}
          </span>
        )
      )}
      {change && (
        <span className="pgv-stage-durations__visually-hidden">
          , {legendLabel(messages, change)}
        </span>
      )}
    </a>
  );

  let comparedWith: string | undefined;
  if (duration !== undefined && compareWith !== undefined) {
    const args = {
      0: formatDuration(duration, locale),
      1: formatDuration(compareWith, locale),
      2: percentChange(duration, compareWith),
      3: since?.displayName ?? "",
    };
    comparedWith = since
      ? messages.format(
          LocalizedMessageKey.stageDurationsComparedWithBefore,
          args,
        )
      : messages.format(LocalizedMessageKey.stageDurationsComparedWith, args);
  }

  const tooltip = [status, comparedWith].filter(Boolean);
  if (tooltip.length === 0) {
    return content;
  }
  return (
    <Tooltip
      content={
        <>
          {tooltip.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </>
      }
    >
      {content}
    </Tooltip>
  );
});

function legendLabel(
  messages: ReturnType<typeof useMessages>,
  change: Change,
): string {
  return messages.format(
    change === "faster"
      ? LocalizedMessageKey.stageDurationsLegendFaster
      : change === "much-slower"
        ? LocalizedMessageKey.stageDurationsLegendMuchSlower
        : LocalizedMessageKey.stageDurationsLegendSlower,
  );
}

function changeOf(
  duration: number | undefined,
  compareWith: Usual | undefined,
): Change | undefined {
  if (duration === undefined || compareWith === undefined) {
    return undefined;
  }
  if (isSlower(duration, compareWith)) {
    return duration >= compareWith.median * 2 ? "much-slower" : "slower";
  }
  return isFaster(duration, compareWith) ? "faster" : undefined;
}

/** Says how many builds are shown and how to read the shading that's on the page. */
function Legend({ rows, count }: { rows: StageRow[]; count: number }) {
  const messages = useMessages();
  const used = new Set(
    rows.flatMap((row) => row.cells.map((cell) => cell.change)),
  );
  const swatches: Array<[Change, string, LocalizedMessageKey]> = [
    ["slower", "▲", LocalizedMessageKey.stageDurationsLegendSlower],
    ["much-slower", "▲", LocalizedMessageKey.stageDurationsLegendMuchSlower],
    ["faster", "▼", LocalizedMessageKey.stageDurationsLegendFaster],
  ];

  return (
    <div className="pgv-stage-durations__legend">
      {count > 1 && (
        <span>
          {messages.format(LocalizedMessageKey.stageDurationsBuilds, {
            0: count,
          })}
        </span>
      )}
      {swatches
        .filter(([change]) => used.has(change))
        .map(([change, arrow, key]) => (
          <span
            key={change}
            className={`pgv-stage-durations__swatch pgv-stage-durations__swatch--${change}`}
          >
            <span className="pgv-stage-durations__arrow" aria-hidden="true">
              {arrow}
            </span>
            {messages.format(key)}
          </span>
        ))}
    </div>
  );
}

// Changes listed before the rest are tucked behind a button, so a long list doesn't push the table
// down the page
const CHANGES_SHOWN = 4;

/**
 * The stages whose duration changed, biggest slowdown first, each narrowing the table down to that
 * stage when pressed.
 */
function Changes({
  rows,
  history,
  loaded,
  filtering,
  changedOnly,
  onChangedOnly,
  focused,
  onFocus,
}: {
  rows: StageRow[];
  history: Build[];
  loaded: boolean;
  filtering: boolean;
  changedOnly: boolean;
  onChangedOnly: (changedOnly: boolean) => void;
  focused?: string;
  onFocus: (name: string) => void;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const id = useId();
  const [expanded, setExpanded] = useState(false);

  const impact = (row: StageRow) => row.step!.after - row.step!.before;
  const changed = rows
    .filter((row) => row.step)
    .sort((a, b) => {
      const slower = (row: StageRow) => row.step!.direction === "slower";
      if (slower(a) !== slower(b)) {
        return slower(a) ? -1 : 1;
      }
      return Math.abs(impact(b)) - Math.abs(impact(a));
    });

  // Builds still loading could change what's found, so nothing is said until they're in
  if (!loaded) {
    return null;
  }

  // Kept even when nothing changed, so a view narrowed down to changes can always be widened
  const changedOnlyToggle = filtering && (
    <span className="jenkins-checkbox">
      <input
        type="checkbox"
        id={id + "changed"}
        checked={changedOnly}
        onChange={(event) => onChangedOnly(event.target.checked)}
      />
      <label htmlFor={id + "changed"}>
        {messages.format(LocalizedMessageKey.stageDurationsChangedOnly)}
      </label>
    </span>
  );

  // Says so when nothing changed, so it isn't mistaken for not having looked
  if (changed.length === 0) {
    return (
      <div className="pgv-stage-durations__changes">
        {changedOnlyToggle}
        <p className="pgv-stage-durations__changes--none">
          {history.length < MIN_SAMPLES + SUSTAINED_BUILDS
            ? messages.format(
                LocalizedMessageKey.stageDurationsNeedMoreBuilds,
                {
                  0: MIN_SAMPLES + SUSTAINED_BUILDS,
                },
              )
            : messages.format(LocalizedMessageKey.stageDurationsNoChanges)}
        </p>
      </div>
    );
  }

  const shown =
    expanded || changed.length <= CHANGES_SHOWN + 1
      ? changed
      : changed.slice(0, CHANGES_SHOWN);

  return (
    <div className="pgv-stage-durations__changes">
      {changedOnlyToggle}
      <div
        className="pgv-stage-durations__changes__items"
        role="group"
        aria-label={messages.format(
          LocalizedMessageKey.stageDurationsChangedStages,
        )}
      >
        {shown.map((row) => {
          const step = row.step!;
          const run = history[step.start].run;
          return (
            <button
              key={row.name}
              type="button"
              className="pgv-stage-durations__change"
              aria-pressed={focused === row.name}
              onClick={() => onFocus(row.name)}
            >
              <span className="pgv-stage-durations__change__name pgv-user-specified-text">
                {row.name}
              </span>
              <span
                className={`pgv-stage-durations__change__percent pgv-stage-durations__change__percent--${step.direction}`}
              >
                <span aria-hidden="true">
                  {step.direction === "slower" ? "▲" : "▼"}
                </span>{" "}
                {percentChange(step.after, step.before)}
                <span className="pgv-stage-durations__visually-hidden">
                  {" "}
                  {messages.format(
                    step.direction === "slower"
                      ? LocalizedMessageKey.stageDurationsSlower
                      : LocalizedMessageKey.stageDurationsFaster,
                  )}
                </span>
              </span>
              <span>
                {formatDuration(step.before, locale)} →{" "}
                {formatDuration(step.after, locale)}
              </span>
              <span className="pgv-stage-durations__change__since">
                {messages.format(LocalizedMessageKey.stageDurationsSinceBuild, {
                  0: run.displayName,
                })}
              </span>
              {focused === row.name && (
                <span
                  className="pgv-stage-durations__change__clear"
                  aria-hidden="true"
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
        {shown.length < changed.length && (
          <button
            type="button"
            className="jenkins-button jenkins-button--tertiary"
            onClick={() => setExpanded(true)}
          >
            {messages.format(LocalizedMessageKey.stageDurationsMore, {
              0: changed.length - shown.length,
            })}
          </button>
        )}
      </div>
    </div>
  );
}

/** Links to the build a stage's change started in, with how much it changed by. */
function StepBadge({
  step,
  run,
  jobPath,
}: {
  step: Step;
  run: RunInfo;
  jobPath: string;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const detail = messages.format(LocalizedMessageKey.stageDurationsStep, {
    0: formatDuration(step.before, locale),
    1: formatDuration(step.after, locale),
    2: percentChange(step.after, step.before),
  });

  return (
    <Tooltip
      content={
        <>
          <div>{detail}</div>
        </>
      }
    >
      <a
        href={jobPath + run.id + "/changes"}
        className={`jenkins-table__link jenkins-table__badge pgv-stage-durations__badge pgv-stage-durations__badge--${step.direction}`}
      >
        {messages.format(
          step.direction === "slower"
            ? LocalizedMessageKey.stageDurationsSlowerSince
            : LocalizedMessageKey.stageDurationsFasterSince,
          { 0: run.displayName },
        )}
      </a>
    </Tooltip>
  );
}

function isInProgress(result: Result): boolean {
  return (
    result === Result.running ||
    result === Result.paused ||
    result === Result.queued
  );
}
