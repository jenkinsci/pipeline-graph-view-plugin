import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  POLL_INTERVAL,
  Result,
  StepInfo,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "./PipelineConsoleModel.tsx";

export default function ConsoleLogStream({
  tailLogs,
  stopTailingLogs,
  scrollToTail,
  step,
  logBuffer,
  setLogBuffer,
  fetchLogText,
  fetchExceptionText,
}: ConsoleLogStreamProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [logVisible, setLogVisible] = useState(true);

  useEffect(() => {
    if (step.state === Result.failure) {
      fetchExceptionText(step.id)
        .then((logBuffer) => setLogBuffer({ ...logBuffer }))
        .catch(console.error);
    }
  }, [step.id, step.state, fetchExceptionText, setLogBuffer]);

  useLayoutEffect(() => {
    if (!logRef.current) return;
    scrollToTail(step.id, logRef.current);
  }, [tailLogs, logBuffer.lines, scrollToTail, step.id]);

  useEffect(() => {
    if (logBuffer.stopTailing) return;
    if (!logRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        setLogVisible(entry.isIntersecting);
      }
    });
    observer.observe(logRef.current);
    return () => observer.disconnect();
  }, [logBuffer.stopTailing]);

  const fetchMore = logVisible && !logBuffer.stopTailing;
  useEffect(() => {
    if (!fetchMore) return;
    fetchLogText(step.id, TAIL_CONSOLE_LOG)
      .then((logBuffer) => setLogBuffer({ ...logBuffer }))
      .catch(console.error);
    const interval = window.setInterval(() => {
      fetchLogText(step.id, TAIL_CONSOLE_LOG)
        .then((logBuffer) => setLogBuffer({ ...logBuffer }))
        .catch(console.error);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMore, fetchLogText, step.id, setLogBuffer]);

  const [scrollToLogLine, setScrollToLogLine] = useState<boolean>(
    window.location.hash.startsWith("#log-"),
  );
  useEffect(() => {
    if (!scrollToLogLine) return;
    let hash = window.location.hash;
    if (!hash.startsWith("#log-")) return;
    let [stepIdPart, lineNumberPart] = hash.slice(5).split("-");
    if (lineNumberPart && stepIdPart !== step.id) {
      // The log line belongs to another step.
      setScrollToLogLine(false);
      return;
    }
    if (!lineNumberPart) {
      // Backwards compatibility for links without a stepId in the hash.
      lineNumberPart = stepIdPart;
      stepIdPart = step.id;
      hash = `#log-${stepIdPart}-${lineNumberPart}`;
      location.hash = hash;
    }
    const element = document.getElementById(hash.slice(1));
    if (!element) return; // Try again the next time the log lines change.
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Toggle hash to refresh the :target css matcher of the active line.
    location.hash = "";
    location.hash = hash;

    setScrollToLogLine(false);
  }, [scrollToLogLine, step.id, logBuffer.lines]);

  return (
    <div
      role="log"
      ref={logRef}
      style={{ scrollMarginBlockEnd: "var(--section-padding)" }}
    >
      {logBuffer.lines.map((content, index) => (
        <ConsoleLine
          key={index}
          lineNumber={String(index)}
          content={content}
          stepId={step.id}
          startByte={logBuffer.startByte}
          stopTailingLogs={stopTailingLogs}
        />
      ))}
    </div>
  );
}

export interface ConsoleLogStreamProps {
  logBuffer: StepLogBufferInfo;
  setLogBuffer: (logBuffer: StepLogBufferInfo) => void;
  fetchLogText: (
    stepId: string,
    startByte: number,
  ) => Promise<StepLogBufferInfo>;
  fetchExceptionText: (stepId: string) => Promise<StepLogBufferInfo>;
  step: StepInfo;
  tailLogs: boolean;
  stopTailingLogs: () => void;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
}
