import "./stage-durations.scss";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { exact, humanise, Total } from "../common/utils/timings.tsx";
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
  usualBefore,
  usualDuration,
} from "./utils.ts";

/**
 * How long each stage took in recent builds, a row per stage with the builds oldest to newest, so a
 * stage that has started taking longer stands out against the builds before it.
 */
export default function StageDurations({ jobPath }: { jobPath: string }) {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [stagesByRun, setStagesByRun] = useState<Record<string, StageInfo[]>>(
    {},
  );

  useEffect(() => {
    startPollingRunsStatus(jobPath, setRuns, (err) => console.error(err));
  }, [jobPath]);

  const onStages = useCallback((id: string, stages: StageInfo[]) => {
    setStagesByRun((previous) =>
      previous[id] === stages ? previous : { ...previous, [id]: stages },
    );
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

interface StageRow {
  name: string;
  /** The stage in each build, oldest first. */
  cells: Array<StageInfo | undefined>;
  /** The stage's usual duration in each build, oldest first. */
  usual: Array<number | undefined>;
  step?: Step;
}

/**
 * @param runs the builds, newest first, as the builds list shows them
 */
export function StageDurationsView({
  runs,
  stagesByRun,
  jobPath,
}: {
  runs: RunInfo[];
  stagesByRun: Record<string, StageInfo[]>;
  jobPath: string;
}) {
  const messages = useMessages();
  const [hovered, setHovered] = useState<number>();

  const builds: Build[] = useMemo(
    () =>
      [...runs].reverse().map((run) => {
        const stages = stagesByRun[run.id];
        return { run, stages: stages && expandMatrixStages(stages) };
      }),
    [runs, stagesByRun],
  );

  const rows: StageRow[] = useMemo(() => {
    const names = stageNames(
      builds.flatMap((build) => (build.stages ? [build.stages] : [])).reverse(),
    );
    return names.map((name) => {
      const cells = builds.map((build) =>
        build.stages?.find((stage) => stage.name === name),
      );
      const usual = cells.map(usualDuration);
      return { name, cells, usual, step: findStep(usual) };
    });
  }, [builds]);

  const totals = builds.map(({ run }) =>
    run.result === Result.success || run.result === Result.unstable
      ? run.duration
      : undefined,
  );

  if (runs.length === 0) {
    return (
      <p className="jenkins-!-text-color-secondary">
        {messages.format(LocalizedMessageKey.noBuilds)}
      </p>
    );
  }

  const column = (index: number) => ({
    onMouseEnter: () => setHovered(index),
    onMouseLeave: () => setHovered(undefined),
    className: index === hovered ? "pgv-stage-durations--hovered" : undefined,
  });

  return (
    <div className="pgv-stage-durations">
      <ChangedStages rows={rows} builds={builds} jobPath={jobPath} />

      <Legend rows={rows} count={builds.length} />

      <div className="pgv-stage-durations__scroller">
        <table className="jenkins-table jenkins-table--small">
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
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">
                  <span className="pgv-user-specified-text">{row.name}</span>
                  {row.step && (
                    <StepBadge
                      step={row.step}
                      run={builds[row.step.start].run}
                      jobPath={jobPath}
                    />
                  )}
                </th>
                {builds.map((build, index) => {
                  const cell = column(index);
                  const change = changeOf(
                    usualDuration(row.cells[index]),
                    comparison(row, index),
                  );
                  return (
                    <td
                      key={build.run.id}
                      {...cell}
                      className={[
                        cell.className,
                        change && `pgv-stage-durations__cell--${change}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <StageCell
                        build={build}
                        stage={row.cells[index]}
                        compareWith={
                          change ? comparison(row, index) : undefined
                        }
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
                  <Sparkline values={row.usual} step={row.step} />
                </td>
              </tr>
            ))}
            <tr className="pgv-stage-durations__total">
              <th scope="row">
                {messages.format(LocalizedMessageKey.stageDurationsTotal)}
              </th>
              {builds.map(({ run }, index) => (
                <td key={run.id} {...column(index)}>
                  <span className="pgv-stage-durations__duration">
                    <LiveTotal
                      total={
                        isInProgress(run.result) ? undefined : run.duration
                      }
                      start={run.timestamp}
                    />
                  </span>
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
    </div>
  );
}

/**
 * What the stage's duration in a build is compared with: how long it took before the change for a
 * build since the stage changed, otherwise how long it usually took in the builds before.
 */
function comparison(row: StageRow, index: number): number | undefined {
  if (row.step && index >= row.step.start) {
    return row.step.before;
  }
  return usualBefore(row.usual, index);
}

function Median({ durations }: { durations: Array<number | undefined> }) {
  const value = baseline(durations);
  return value === undefined ? null : (
    <span className="pgv-stage-durations__duration">
      <Total ms={value} />
    </span>
  );
}

function BuildHeading({ run, jobPath }: { run: RunInfo; jobPath: string }) {
  const locale = useLocale();
  return (
    <a
      href={jobPath + run.id + "/"}
      className="pgv-stage-durations__build pgv-user-specified-text"
      title={exact(run.timestamp, locale)}
    >
      {run.result !== Result.success && <StatusIcon status={run.result} />}
      {run.displayName}
    </a>
  );
}

function StageCell({
  build,
  stage,
  compareWith,
  stagePath,
}: {
  build: Build;
  stage: StageInfo | undefined;
  compareWith: number | undefined;
  stagePath: string;
}) {
  const messages = useMessages();
  const locale = useLocale();

  if (!build.stages) {
    return <span className="pgv-stage-durations__loading" />;
  }

  if (!stage) {
    return (
      <span
        className="pgv-stage-durations__missing"
        title={messages.format(LocalizedMessageKey.stageDurationsNotRun)}
      >
        –
      </span>
    );
  }

  const duration = usualDuration(stage);

  const content = (
    <a href={stagePath + stage.id} className="pgv-stage-durations__stage">
      {stage.state !== Result.success && <StageStatusIcon stage={stage} />}
      {!stage.skeleton && (
        <span className="pgv-stage-durations__duration">
          <LiveTotal
            total={stage.totalDurationMillis}
            start={stage.startTimeMillis}
          />
        </span>
      )}
    </a>
  );

  // Only given when the build is shaded, to say what it was compared with
  if (duration === undefined || compareWith === undefined) {
    return content;
  }

  const percent = Math.round((duration / compareWith - 1) * 100);
  return (
    <Tooltip
      content={messages.format(LocalizedMessageKey.stageDurationsComparedWith, {
        0: humanise(duration, locale),
        1: humanise(compareWith, locale),
        2: (percent > 0 ? "+" : "") + percent + "%",
      })}
    >
      {content}
    </Tooltip>
  );
}

function changeOf(
  duration: number | undefined,
  compareWith: number | undefined,
): "" | "slower" | "much-slower" | "faster" {
  if (duration === undefined || compareWith === undefined) {
    return "";
  }
  if (isSlower(duration, compareWith)) {
    return duration >= compareWith * 2 ? "much-slower" : "slower";
  }
  return isFaster(duration, compareWith) ? "faster" : "";
}

/**
 * Says how many builds are shown and how to read the shading, and when nothing changed, says so,
 * so an empty set of banners isn't mistaken for not having looked.
 */
function Legend({ rows, count }: { rows: StageRow[]; count: number }) {
  const messages = useMessages();
  const note =
    count <= MIN_SAMPLES
      ? messages.format(LocalizedMessageKey.stageDurationsNeedMoreBuilds, {
          0: MIN_SAMPLES + 1,
        })
      : rows.some((row) => row.step)
        ? undefined
        : messages.format(LocalizedMessageKey.stageDurationsNoChanges);

  return (
    <div className="pgv-stage-durations__legend jenkins-!-text-color-secondary">
      <span>
        {messages.format(LocalizedMessageKey.stageDurationsBuilds, {
          0: count,
        })}
      </span>
      {note && <span>{note}</span>}
      <span className="pgv-stage-durations__swatch pgv-stage-durations__swatch--slower">
        {messages.format(LocalizedMessageKey.stageDurationsLegendSlower)}
      </span>
      <span className="pgv-stage-durations__swatch pgv-stage-durations__swatch--much-slower">
        {messages.format(LocalizedMessageKey.stageDurationsLegendMuchSlower)}
      </span>
      <span className="pgv-stage-durations__swatch pgv-stage-durations__swatch--faster">
        {messages.format(LocalizedMessageKey.stageDurationsLegendFaster)}
      </span>
    </div>
  );
}

/** The stages whose duration changed, biggest slowdown first, with the build each change started in. */
function ChangedStages({
  rows,
  builds,
  jobPath,
}: {
  rows: StageRow[];
  builds: Build[];
  jobPath: string;
}) {
  const messages = useMessages();
  const locale = useLocale();

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

  if (changed.length === 0) {
    return null;
  }

  return (
    <div className="jenkins-card pgv-stage-durations__changes">
      <div className="jenkins-card__title">
        {messages.format(LocalizedMessageKey.stageDurationsChangedStages)}
      </div>
      <div className="jenkins-card__content">
        <table className="jenkins-table jenkins-table--small">
          <thead>
            <tr>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsStage)}
              </th>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsBefore)}
              </th>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsNow)}
              </th>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsChange)}
              </th>
              <th scope="col">
                {messages.format(LocalizedMessageKey.stageDurationsSince)}
              </th>
            </tr>
          </thead>
          <tbody>
            {changed.map((row) => {
              const step = row.step!;
              const run = builds[step.start].run;
              const percent = Math.round((step.after / step.before - 1) * 100);
              return (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>
                    <span className="pgv-stage-durations__duration">
                      {humanise(step.before, locale)}
                    </span>
                  </td>
                  <td>
                    <span className="pgv-stage-durations__duration">
                      {humanise(step.after, locale)}
                    </span>
                  </td>
                  <td
                    className={`pgv-stage-durations__change pgv-stage-durations__change--${step.direction}`}
                  >
                    {step.direction === "slower" ? "▲" : "▼"}{" "}
                    {(percent > 0 ? "+" : "") + percent + "%"}
                  </td>
                  <td>
                    <a
                      href={jobPath + run.id + "/"}
                      className="jenkins-table__link"
                    >
                      #{run.id}
                    </a>
                    {step.builds < SUSTAINED_BUILDS && (
                      <span className="pgv-stage-durations__note">
                        {messages.format(
                          LocalizedMessageKey.stageDurationsRecent,
                          { 0: step.builds },
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
  const percent = Math.round((step.after / step.before - 1) * 100);
  const detail = messages.format(LocalizedMessageKey.stageDurationsStep, {
    0: humanise(step.before, locale),
    1: humanise(step.after, locale),
    2: (percent > 0 ? "+" : "") + percent + "%",
  });

  return (
    <Tooltip
      content={
        <>
          <div>{detail}</div>
          {step.builds < SUSTAINED_BUILDS && (
            <div className="jenkins-!-text-color-secondary">
              {messages.format(LocalizedMessageKey.stageDurationsRecent, {
                0: step.builds,
              })}
            </div>
          )}
        </>
      }
    >
      <a
        href={jobPath + run.id + "/"}
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
