import React, { useEffect, useState, Suspense } from "react";
import "./console-log-card.scss";

import {
  LOG_FETCH_SIZE,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel";

import ConsoleLogModal from "./ConsoleLogModal";
import StatusIcon from "../../../common/components/status-icon";
import { total } from "../../../common/utils/timings";

const ConsoleLogStream = React.lazy(() => import("./ConsoleLogStream"));

export default function ConsoleLogCard(props: ConsoleLogCardProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (props.isExpanded) {
      props.handleMoreConsoleClick(props.step.id, props.stepBuffer.startByte);
    }
  }, [props.isExpanded]);

  const handleToggle = (event: React.MouseEvent<HTMLElement>) => {
    props.handleStepToggle(event, props.step.id);
  };

  const showMoreLogs = () => {
    let startByte = props.stepBuffer.startByte - LOG_FETCH_SIZE;
    if (startByte < 0) startByte = 0;
    props.handleMoreConsoleClick(props.step.id, startByte);
  };

  const getTruncatedLogWarning = () => {
    if (props.stepBuffer.lines && props.stepBuffer.startByte > 0) {
      return (
        <button
          onClick={showMoreLogs}
          className={
            "pgv-show-more-logs jenkins-button jenkins-!-warning-color"
          }
        >
          There’s more to see - {prettySizeString(props.stepBuffer.startByte)}{" "}
          of logs hidden
        </button>
      );
    }
    return undefined;
  };

  const prettySizeString = (size: number) => {
    const kib = 1024;
    const mib = 1024 * 1024;
    const gib = 1024 * 1024 * 1024;
    if (size < kib) return `${size}B`;
    if (size < mib) return `${(size / kib).toFixed(2)}KiB`;
    if (size < gib) return `${(size / mib).toFixed(2)}MiB`;
    return `${(size / gib).toFixed(2)}GiB`;
  };

  return (
    <div className={"pgv-step-detail-group"} key={`step-card-${props.step.id}`}>
      <button
        onClick={handleToggle}
        className={
          "pgv-step-detail-header jenkins-button " +
          (props.isExpanded ? "" : "jenkins-button--tertiary")
        }
        key={`step-action-area-${props.step.id}`}
      >
        <div className="pgv-step-detail-header__content">
          <StatusIcon
            status={props.step.state}
            percentage={props.step.completePercent}
          />
          <span style={{ fontWeight: "450" }}>{props.step.name}</span>
          <span
            style={{
              color: "var(--text-color-secondary)",
              fontFamily: "var(--font-family-mono)",
            }}
          >
            {props.step.title}
          </span>
        </div>

        <div className="pgv-step-detail-header__actions">
          <span
            style={{
              color: "var(--text-color-secondary)",
            }}
          >
            {total(props.step.totalDurationMillis)}
          </span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className={"svgtest"}
            style={{ rotate: props.isExpanded ? "90deg" : "0deg" }}
          >
            <path
              fill="none"
              stroke="var(--text-color-secondary)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
              opacity={0.75}
              d="M184 112l144 144-144 144"
            />
          </svg>
        </div>
      </button>

      <ConsoleLogModal
        logBuffer={props.stepBuffer}
        handleMoreConsoleClick={props.handleMoreConsoleClick}
        step={props.step}
        truncatedLogWarning={getTruncatedLogWarning()}
        maxHeightScale={0.85}
        open={open}
        setClose={() => setOpen(false)}
      />

      {props.isExpanded && (
        <div style={{ paddingTop: "0.5rem" }}>
          {getTruncatedLogWarning()}
          <Suspense>
            <ConsoleLogStream
              logBuffer={props.stepBuffer}
              handleMoreConsoleClick={props.handleMoreConsoleClick}
              step={props.step}
              maxHeightScale={0.65}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export type ConsoleLogCardProps = {
  step: StepInfo;
  stepBuffer: StepLogBufferInfo;
  isExpanded: boolean;
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  scrollParentId: string;
};
