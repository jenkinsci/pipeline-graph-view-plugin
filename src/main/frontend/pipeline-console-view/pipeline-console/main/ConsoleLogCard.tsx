import React, { useEffect, useState, Suspense } from "react";
import "./console-log-card.scss";

import {
  LOG_FETCH_SIZE,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel";

import ConsoleLogModal from "./ConsoleLogModal";
import { getStepStatus } from "../../../step-status/StepStatus";
import Skeleton from "./Skeleton";

const ConsoleLogStream = React.lazy(() => import("./ConsoleLogStream"));

type ConsoleLogCardProps = {
  step: StepInfo;
  stepBuffer: StepLogBufferInfo;
  isExpanded: boolean;
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  scrollParentId: string;
};

function ConsoleLogCard(props: ConsoleLogCardProps) {
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
          Missing {prettySizeString(props.stepBuffer.startByte)} of logs. Click
          to see more logs
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

  const statusIcon = getStepStatus(
    props.step.state,
    props.step.completePercent,
    10,
  );

  return (
    <div
      className={
        "step-detail-group " +
        (props.isExpanded ? "step-detail-group--expanded" : "")
      }
      key={`step-card-${props.step.id}`}
    >
      <div className="step-detail-headerparent">
        <button
          onClick={handleToggle}
          className={
            "step-detail-header jenkins-button " +
            (props.isExpanded ? "" : "jenkins-button--tertiary")
          }
          key={`step-action-area-${props.step.id}`}
        >
          <div className="thinggg">
            {statusIcon}
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

          <div className="actionsss">
            <span
              style={{
                color: "var(--text-color-secondary)",
              }}
            >
              {props.step.totalDurationMillis}
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
      </div>

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
        <div style={{ paddingBlock: "0.5rem" }}>
          <div>{getTruncatedLogWarning()}</div>
          <Suspense fallback={<Skeleton />}>
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

export default ConsoleLogCard;
