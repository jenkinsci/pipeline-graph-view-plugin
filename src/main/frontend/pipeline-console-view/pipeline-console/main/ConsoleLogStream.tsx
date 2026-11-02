import "./console-section.scss";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { BuildStep } from "../../../common/RestClient.tsx";
import { ConsoleSectionNodeRenderer, nodeKey } from "./ConsoleSection.tsx";
import { ConsoleSectionParser } from "./parseConsoleSections.ts";
import {
  POLL_INTERVAL,
  Result,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "./PipelineConsoleModel.tsx";

export default function ConsoleLogStream({
  tailLogs,
  stopTailingLogs,
  scrollToTail,
  stepId,
  stepState,
  logBuffer,
  updateLogBufferIfChanged,
  fetchLogText,
  fetchExceptionText,
  currentRunPath,
  buildStep,
}: ConsoleLogStreamProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [logVisible, setLogVisible] = useState(true);

  useEffect(() => {
    if (stepState === Result.failure) {
      updateLogBufferIfChanged(fetchExceptionText(stepId));
    }
  }, [stepId, stepState, fetchExceptionText, updateLogBufferIfChanged]);

  useLayoutEffect(() => {
    if (!logRef.current) return;
    scrollToTail(stepId, logRef.current);
  }, [tailLogs, logBuffer.lines, scrollToTail, stepId]);

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
    updateLogBufferIfChanged(fetchLogText(stepId, TAIL_CONSOLE_LOG));
    const interval = window.setInterval(() => {
      updateLogBufferIfChanged(fetchLogText(stepId, TAIL_CONSOLE_LOG));
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMore, fetchLogText, stepId, updateLogBufferIfChanged]);

  const logPrefix = "#log-";
  const [scrollToLogLine, setScrollToLogLine] = useState<boolean>(
    window.location.hash.startsWith(logPrefix),
  );
  useEffect(() => {
    if (!scrollToLogLine) return;
    let hash = window.location.hash;
    if (!hash.startsWith(logPrefix)) return;
    const lastIdx = hash.lastIndexOf("-");
    let stepIdPart = hash.slice(logPrefix.length, lastIdx);
    const lineNumberPart = hash.slice(lastIdx + 1);
    if (stepIdPart && stepIdPart !== stepId) {
      // The log line belongs to another step.
      setScrollToLogLine(false);
      return;
    }
    if (!stepIdPart) {
      // Backwards compatibility for links without a stepId in the hash.
      stepIdPart = stepId;
      hash = `${logPrefix}${stepIdPart}-${lineNumberPart}`;
      location.hash = hash;
    }
    const element = document.getElementById(hash.slice(1));
    if (!element) return; // Try again the next time the log lines change.
    for (
      let section = element.closest("details");
      section;
      section = section.parentElement?.closest("details") ?? null
    ) {
      section.open = true;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Toggle hash to refresh the :target css matcher of the active line.
    location.hash = "";
    location.hash = hash;

    setScrollToLogLine(false);
  }, [scrollToLogLine, stepId, logBuffer.lines]);

  const [sectionParser] = useState(() => new ConsoleSectionParser());
  const logLineCount =
    logBuffer.lines.length - (logBuffer.exceptionText?.length ?? 0);
  // A last line without a trailing newline may still be extended by the next
  // poll, so it is not parsed for markers until it is complete.
  const stableCount =
    logBuffer.stopTailing || logBuffer.hasTrailingNewLine
      ? logLineCount
      : Math.max(0, logLineCount - 1);
  const sectionTree = useMemo(
    () =>
      sectionParser.update({
        lines: logBuffer.lines,
        startByte: logBuffer.startByte,
        stableCount,
        logLineCount,
      }),
    [
      sectionParser,
      logBuffer.lines,
      logBuffer.startByte,
      stableCount,
      logLineCount,
    ],
  );

  return (
    <div
      role="log"
      ref={logRef}
      style={{ scrollMarginBlockEnd: "var(--section-padding)" }}
    >
      {sectionTree.map((node) => (
        <ConsoleSectionNodeRenderer
          key={nodeKey(node)}
          node={node}
          stepId={stepId}
          startByte={logBuffer.startByte}
          stopTailingLogs={stopTailingLogs}
          currentRunPath={currentRunPath}
          buildStep={buildStep}
        />
      ))}
    </div>
  );
}

export interface ConsoleLogStreamProps {
  logBuffer: StepLogBufferInfo;
  updateLogBufferIfChanged: (p: Promise<StepLogBufferInfo>) => void;
  fetchLogText: (
    stepId: string,
    startByte: number,
  ) => Promise<StepLogBufferInfo>;
  fetchExceptionText: (stepId: string) => Promise<StepLogBufferInfo>;
  stepId: string;
  stepState: Result;
  tailLogs: boolean;
  stopTailingLogs: () => void;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
  currentRunPath: string;
  buildStep?: BuildStep;
}
