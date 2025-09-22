import "./console-log-card.scss";

import Linkify from "linkify-react";
import {
  lazy,
  MouseEvent as ReactMouseEvent,
  Suspense,
  useEffect,
} from "react";

import StatusIcon from "../../../common/components/status-icon.tsx";
import Tooltip from "../../../common/components/tooltip.tsx";
import { LocalizedMessageKey, useMessages } from "../../../common/i18n";
import { classNames } from "../../../common/utils/classnames.ts";
import { linkifyJsOptions } from "../../../common/utils/linkify-js.ts";
import LiveTotal from "../../../common/utils/live-total.tsx";
import {
  LOG_FETCH_SIZE,
  StepInfo,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "./PipelineConsoleModel.tsx";
import InputStep from "./steps/InputStep.tsx";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream.tsx"));

export default function ConsoleLogCard({
  step,
  stepBuffer,
  isExpanded,
  onMoreConsoleClick,
  onStepToggle,
  fetchExceptionText,
}: ConsoleLogCardProps) {
  useEffect(() => {
    if (isExpanded) {
      onMoreConsoleClick(step.id, TAIL_CONSOLE_LOG);
    }
  }, [isExpanded, onMoreConsoleClick, step.id, stepBuffer]);

  const handleToggle = (e: ReactMouseEvent<HTMLElement>) => {
    // Only prevent left clicks
    if (e.button !== 0 || e.metaKey || e.ctrlKey) {
      return;
    }

    e.preventDefault();

    history.replaceState({}, "", `?selected-node=` + step.id);

    onStepToggle(step.id);
  };

  const messages = useMessages();

  const inputStep = step.inputStep;
  if (inputStep && !inputStep.parameters) {
    return <InputStep step={step} />;
  }

  return (
    <div className={"pgv-step-detail-group"} key={`step-card-${step.id}`}>
      <div
        className={classNames("pgv-step-detail-header", "jenkins-button", {
          "jenkins-button--tertiary": !isExpanded,
        })}
      >
        <a
          href={`?selected-node=` + step.id}
          onClick={handleToggle}
          key={`step-action-area-${step.id}`}
        >
          <div className="pgv-step-detail-header__content">
            <StatusIcon status={step.state} percentage={step.completePercent} />

            {step.title !== "" && (
              <span>
                <Linkify options={linkifyJsOptions}>{step.title}</Linkify>
              </span>
            )}

            {step.name !== "" && (
              <span>
                <Linkify options={linkifyJsOptions}>{step.name}</Linkify>
              </span>
            )}

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className={"pgv-step-detail-header__chevron"}
              style={{ rotate: isExpanded ? "90deg" : "0deg" }}
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
              <LiveTotal
                total={step.totalDurationMillis}
                start={step.startTimeMillis}
              />
            </span>
          </div>
        </a>

        <Tooltip content={messages.format(LocalizedMessageKey.consoleNewTab)}>
          <a
            href={`log?nodeId=${step.id}`}
            className={"jenkins-button jenkins-button--tertiary"}
            target="_blank"
            rel="noreferrer"
            aria-label={messages.format(LocalizedMessageKey.consoleNewTab)}
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

      {isExpanded && (
        <ConsoleLogBody
          step={step}
          stepBuffer={stepBuffer}
          onMoreConsoleClick={onMoreConsoleClick}
          fetchExceptionText={fetchExceptionText}
          isExpanded={false}
          onStepToggle={onStepToggle}
        />
      )}
    </div>
  );
}

function ConsoleLogBody({
  step,
  stepBuffer,
  onMoreConsoleClick,
  fetchExceptionText,
}: ConsoleLogCardProps) {
  const prettySizeString = (size: number) => {
    const kib = 1024;
    const mib = 1024 * 1024;
    const gib = 1024 * 1024 * 1024;
    if (size < kib) return `${size}B`;
    if (size < mib) return `${(size / kib).toFixed(2)}KiB`;
    if (size < gib) return `${(size / mib).toFixed(2)}MiB`;
    return `${(size / gib).toFixed(2)}GiB`;
  };

  const showMoreLogs = () => {
    let startByte = stepBuffer.startByte - LOG_FETCH_SIZE;
    if (startByte < 0) startByte = 0;
    onMoreConsoleClick(step.id, startByte);
  };

  const getTruncatedLogWarning = () => {
    if (stepBuffer.lines && stepBuffer.startByte > 0) {
      return (
        <button
          onClick={showMoreLogs}
          className={
            "pgv-show-more-logs jenkins-button jenkins-!-warning-color"
          }
        >
          There’s more to see - {prettySizeString(stepBuffer.startByte)} of logs
          hidden
        </button>
      );
    }
    return undefined;
  };

  return (
    <div style={{ paddingTop: "0.5rem" }}>
      {getTruncatedLogWarning()}
      <Suspense>
        <ConsoleLogStream
          logBuffer={stepBuffer}
          onMoreConsoleClick={onMoreConsoleClick}
          fetchExceptionText={fetchExceptionText}
          step={step}
          maxHeightScale={0.65}
        />
      </Suspense>
    </div>
  );
}

export type ConsoleLogCardProps = {
  step: StepInfo;
  stepBuffer: StepLogBufferInfo;
  isExpanded: boolean;
  onStepToggle: (nodeId: string) => void;
  onMoreConsoleClick: (nodeId: string, startByte: number) => void;
  fetchExceptionText: (nodeId: string) => void;
};
