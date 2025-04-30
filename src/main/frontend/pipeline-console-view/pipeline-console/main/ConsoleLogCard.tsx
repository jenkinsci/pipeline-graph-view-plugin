import "./console-log-card.scss";

import {
  lazy,
  MouseEvent as ReactMouseEvent,
  Suspense,
  useEffect,
} from "react";

import StatusIcon from "../../../common/components/status-icon.tsx";
import Tooltip from "../../../common/components/tooltip.tsx";
import { classNames } from "../../../common/utils/classnames.ts";
import { Total } from "../../../common/utils/timings.tsx";
import {
  LOG_FETCH_SIZE,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream.tsx"));

export default function ConsoleLogCard(props: ConsoleLogCardProps) {
  useEffect(() => {
    if (props.isExpanded) {
      props.onMoreConsoleClick(props.step.id, props.stepBuffer.startByte);
    }
  }, [props.isExpanded]);

  const handleToggle = (e: ReactMouseEvent<HTMLElement>) => {
    // Only prevent left clicks
    if (e.button !== 0 || e.metaKey || e.ctrlKey) {
      return;
    }

    e.preventDefault();

    history.replaceState({}, "", `?selected-node=` + props.step.id);

    props.onStepToggle(props.step.id);
  };

  const showMoreLogs = () => {
    let startByte = props.stepBuffer.startByte - LOG_FETCH_SIZE;
    if (startByte < 0) startByte = 0;
    props.onMoreConsoleClick(props.step.id, startByte);
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
      <div
        className={classNames("pgv-step-detail-header", "jenkins-button", {
          "jenkins-button--tertiary": !props.isExpanded,
        })}
      >
        <a
          href={`?selected-node=` + props.step.id}
          onClick={handleToggle}
          key={`step-action-area-${props.step.id}`}
        >
          <div className="pgv-step-detail-header__content">
            <StatusIcon
              status={props.step.state}
              percentage={props.step.completePercent}
            />

            {props.step.title !== "" && <span>{props.step.title}</span>}

            {props.step.name !== "" && <span>{props.step.name}</span>}

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className={"pgv-step-detail-header__chevron"}
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

          <div className="pgv-step-detail-header__actions">
            <span
              style={{
                color: "var(--text-color-secondary)",
                fontWeight: "normal",
              }}
            >
              <Total ms={props.step.totalDurationMillis} />
            </span>
          </div>
        </a>

        <Tooltip content={"View step as plain text"}>
          <a
            href={`log?nodeId=${props.step.id}`}
            className={"jenkins-button jenkins-button--tertiary"}
            target="_blank"
            rel="noreferrer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path
                d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48M336 64h112v112M224 288L440 72"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
            </svg>
          </a>
        </Tooltip>
      </div>

      {props.isExpanded && (
        <div style={{ paddingTop: "0.5rem" }}>
          {getTruncatedLogWarning()}
          <Suspense>
            <ConsoleLogStream
              logBuffer={props.stepBuffer}
              onMoreConsoleClick={props.onMoreConsoleClick}
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
  onStepToggle: (nodeId: string) => void;
  onMoreConsoleClick: (nodeId: string, startByte: number) => void;
};
