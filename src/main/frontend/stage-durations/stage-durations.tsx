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
import { humanise, Total } from "../common/utils/timings.tsx";
import { RunInfo } from "../multi-pipeline-graph-view/multi-pipeline-graph/main/MultiPipelineGraphModel.ts";
import startPollingRunsStatus from "../multi-pipeline-graph-view/multi-pipeline-graph/main/support/startPollingRunsStatus.ts";
import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { expandMatrixStages } from "../run-snippet/components/utils.ts";
import { baseline, isSlower, stageColumns, usualDuration } from "./utils.ts";

/**
 * How long each stage took in recent builds, one row per build, so a stage that has started taking
 * longer stands out against the builds before it.
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
      <StageDurationsTable
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
  const { run: status } = useRunPoller({
    currentRunPath: jobPath + run.id + "/",
    currentRunStartTime: run.timestamp,
  });

  useEffect(() => {
    onStages(run.id, status.stages);
  }, [onStages, run.id, status.stages]);

  return null;
}

export function StageDurationsTable({
  runs,
  stagesByRun,
  jobPath,
}: {
  runs: RunInfo[];
  stagesByRun: Record<string, StageInfo[]>;
  jobPath: string;
}) {
  const messages = useMessages();

  const rows = useMemo(
    () =>
      runs.map((run) => ({
        run,
        stages: expandMatrixStages(stagesByRun[run.id] ?? []),
      })),
    [runs, stagesByRun],
  );
  const columns = useMemo(
    () => stageColumns(rows.map((row) => row.stages)),
    [rows],
  );
  // Each column's usual durations, by row
  const durations = useMemo(
    () =>
      columns.map((name) =>
        rows.map((row) =>
          usualDuration(row.stages.find((stage) => stage.name === name)),
        ),
      ),
    [columns, rows],
  );

  if (runs.length === 0) {
    return (
      <p className="jenkins-!-text-color-secondary">
        {messages.format(LocalizedMessageKey.noBuilds)}
      </p>
    );
  }

  return (
    <div className="pgv-stage-durations">
      <table className="jenkins-table jenkins-table--small">
        <thead>
          <tr>
            <th>
              <span className="jenkins-visually-hidden">
                {messages.format(LocalizedMessageKey.stageDurationsBuild)}
              </span>
            </th>
            {columns.map((name) => (
              <th key={name} className="pgv-user-specified-text">
                {name}
              </th>
            ))}
            <th>{messages.format(LocalizedMessageKey.stageDurationsTotal)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ run, stages }, rowIndex) => (
            <tr key={run.id}>
              <td>
                <a
                  href={jobPath + run.id + "/"}
                  className="pgv-stage-durations__build pgv-user-specified-text"
                >
                  <StatusIcon status={run.result} />
                  {run.displayName}
                </a>
              </td>
              {columns.map((name, columnIndex) => (
                <td key={name}>
                  <StageCell
                    stage={stages.find((stage) => stage.name === name)}
                    usual={baseline(durations[columnIndex], rowIndex)}
                    stagePath={jobPath + run.id + "/stages?selected-node="}
                  />
                </td>
              ))}
              <td className="pgv-stage-durations__duration">
                <LiveTotal
                  total={isInProgress(run.result) ? undefined : run.duration}
                  start={run.timestamp}
                />
              </td>
            </tr>
          ))}
          <tr className="pgv-stage-durations__median">
            <td>{messages.format(LocalizedMessageKey.stageDurationsMedian)}</td>
            {durations.map((column, index) => {
              const value = baseline(column);
              return (
                <td
                  key={columns[index]}
                  className="pgv-stage-durations__duration"
                >
                  {value !== undefined && <Total ms={value} />}
                </td>
              );
            })}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StageCell({
  stage,
  usual,
  stagePath,
}: {
  stage: StageInfo | undefined;
  usual: number | undefined;
  stagePath: string;
}) {
  const messages = useMessages();
  const locale = useLocale();

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

  // Placeholders are the stages still to come, so there's no duration or stage to link to yet
  if (stage.skeleton) {
    return (
      <span className="pgv-stage-durations__stage">
        <StageStatusIcon stage={stage} />
      </span>
    );
  }

  const duration = usualDuration(stage);
  const slower =
    duration !== undefined && usual !== undefined && isSlower(duration, usual);

  return (
    <a href={stagePath + stage.id} className="pgv-stage-durations__stage">
      <StageStatusIcon stage={stage} />
      <span className="pgv-stage-durations__duration">
        <LiveTotal
          total={stage.totalDurationMillis}
          start={stage.startTimeMillis}
        />
      </span>
      {slower && (
        <SlowerMarker
          label={messages.format(LocalizedMessageKey.stageDurationsSlower, {
            0: Math.round((duration / usual - 1) * 100),
            1: humanise(usual, locale),
          })}
        />
      )}
    </a>
  );
}

function SlowerMarker({ label }: { label: string }) {
  return (
    <Tooltip content={label}>
      <span
        className="pgv-stage-durations__slower"
        role="img"
        aria-label={label}
      >
        ▲
      </span>
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
