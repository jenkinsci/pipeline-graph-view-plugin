import "./console-log-card.scss";

import Linkify from "linkify-react";
import {
  Dispatch,
  lazy,
  memo,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import StatusIcon from "../../../common/components/status-icon.tsx";
import Tooltip from "../../../common/components/tooltip.tsx";
import { LocalizedMessageKey, useMessages } from "../../../common/i18n";
import { classNames } from "../../../common/utils/classnames.ts";
import { linkifyJsOptions } from "../../../common/utils/linkify-js.ts";
import LiveTotal from "../../../common/utils/live-total.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "./PipelineConsoleModel.tsx";
import { useFilter } from "./providers/filter-provider.tsx";
import InputStep from "./steps/InputStep.tsx";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream.tsx"));

export default function ConsoleLogCard({
  tailLogs,
  scrollToTail,
  stopTailingLogs,
  step,
  stepBuffers,
  isExpanded,
  fetchLogText,
  onStepToggle,
  fetchExceptionText,
}: ConsoleLogCardProps) {
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
  const { showHiddenSteps } = useFilter();

  const inputStep = step.inputStep;
  if (inputStep && !inputStep.parameters) {
    return <InputStep step={step} />;
  }

  return (
    <div
      className={classNames("pgv-step-detail-group", {
        "pgv-step-hidden": step.flags?.hidden === true && !showHiddenSteps,
      })}
      key={`step-card-${step.id}`}
    >
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
            <StatusIcon status={step.state} />

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
          tailLogs={tailLogs}
          scrollToTail={scrollToTail}
          stopTailingLogs={stopTailingLogs}
          stepId={step.id}
          stepState={step.state}
          stepBuffers={stepBuffers}
          fetchLogText={fetchLogText}
          fetchExceptionText={fetchExceptionText}
          onStepToggle={onStepToggle}
        />
      )}
    </div>
  );
}

function defaultStepBuffer(): StepLogBufferInfo {
  return {
    lines: [],
    startByte: 0,
    endByte: TAIL_CONSOLE_LOG,
  };
}

function setStepBufferIfChanged(
  setStepBuffer: Dispatch<SetStateAction<StepLogBufferInfo>>,
  next: StepLogBufferInfo,
) {
  setStepBuffer((prev) => {
    if (
      prev.startByte === next.startByte &&
      prev.endByte === next.endByte &&
      prev.lines === next.lines &&
      prev.stopTailing === next.stopTailing
    ) {
      return prev;
    }
    return { ...next };
  });
}

const ConsoleLogBody = memo(function ConsoleLogBody({
  tailLogs,
  scrollToTail,
  stopTailingLogs,
  stepId,
  stepState,
  stepBuffers,
  fetchLogText,
  fetchExceptionText,
}: ConsoleLogCardBodyProps) {
  const [stepBuffer, setStepBuffer] = useState<StepLogBufferInfo>({
    ...(stepBuffers.get(stepId) || defaultStepBuffer()),
  });

  useEffect(() => {
    const next = stepBuffers.get(stepId) || defaultStepBuffer();
    setStepBufferIfChanged(setStepBuffer, next);
  }, [stepBuffers, stepId]);

  const updateStepBufferIfChanged = useCallback(
    (promise: Promise<StepLogBufferInfo>) => {
      promise
        .then((next) => setStepBufferIfChanged(setStepBuffer, next))
        .catch(console.error);
    },
    [],
  );

  useEffect(() => {
    // prefetch while lazy loading ConsoleLogStream
    updateStepBufferIfChanged(fetchLogText(stepId, TAIL_CONSOLE_LOG));
  }, [fetchLogText, stepId, updateStepBufferIfChanged]);

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
    // Double the amount of fetched logs with every click.
    const alreadyFetched = stepBuffer.endByte - stepBuffer.startByte;
    const startByte = Math.max(0, stepBuffer.startByte - alreadyFetched);
    updateStepBufferIfChanged(fetchLogText(stepId, startByte));
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
          tailLogs={tailLogs}
          scrollToTail={scrollToTail}
          stopTailingLogs={stopTailingLogs}
          logBuffer={stepBuffer}
          updateLogBufferIfChanged={updateStepBufferIfChanged}
          fetchLogText={fetchLogText}
          fetchExceptionText={fetchExceptionText}
          stepId={stepId}
          stepState={stepState}
        />
      </Suspense>
    </div>
  );
});

export type ConsoleLogCardProps = {
  step: StepInfo;
  stepBuffers: Map<string, StepLogBufferInfo>;
  isExpanded: boolean;
  onStepToggle: (nodeId: string) => void;
  fetchLogText: (
    nodeId: string,
    startByte: number,
  ) => Promise<StepLogBufferInfo>;
  fetchExceptionText: (nodeId: string) => Promise<StepLogBufferInfo>;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
  stopTailingLogs: () => void;
};

export type ConsoleLogCardBodyProps = {
  stepId: string;
  stepState: Result;
  stepBuffers: Map<string, StepLogBufferInfo>;
  onStepToggle: (nodeId: string) => void;
  fetchLogText: (
    nodeId: string,
    startByte: number,
  ) => Promise<StepLogBufferInfo>;
  fetchExceptionText: (nodeId: string) => Promise<StepLogBufferInfo>;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
  stopTailingLogs: () => void;
};
