import { useEffect, useRef, useState } from "react";

import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  POLL_INTERVAL,
  Result,
  StepInfo,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "./PipelineConsoleModel.tsx";

function canStickToBottom() {
  // Avoid scrolling to the bottom when a log line is focussed.
  return !window.location.hash.startsWith("#log-");
}

export default function ConsoleLogStream({
  step,
  logBuffer,
  onMoreConsoleClick,
  fetchExceptionText,
}: ConsoleLogStreamProps) {
  const appendInterval = useRef<number | null>(null);
  const [stickToBottom, setStickToBottom] = useState(false);

  useEffect(() => {
    return () => {
      if (appendInterval.current) {
        clearInterval(appendInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (step.state === Result.failure) {
      fetchExceptionText(step.id);
    }
  }, [step.id, step.state, fetchExceptionText]);

  useEffect(() => {
    if (stickToBottom && logBuffer.lines.length > 0 && canStickToBottom()) {
      // Scroll to bottom of the log stream
      if (logBuffer.lines) {
        requestAnimationFrame(() => {
          if (!canStickToBottom()) return;
          const scrollTarget = document.documentElement.scrollHeight;
          window.scrollTo({ top: scrollTarget });
        });
      }
    }
  }, [stickToBottom, logBuffer.lines]);

  useEffect(() => {
    if (!canStickToBottom()) return;
    const handleScroll = () => {
      if (!canStickToBottom()) {
        window.removeEventListener("scroll", handleScroll);
        setStickToBottom(false);
        return;
      }
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.body.scrollHeight;
      const isAtBottom = pageHeight - scrollPosition < 300;

      setStickToBottom(isAtBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const shouldRequestMoreLogs =
      step.state === Result.running || logBuffer.endByte < 0;

    if (stickToBottom && shouldRequestMoreLogs) {
      if (!appendInterval.current) {
        appendInterval.current = window.setInterval(() => {
          onMoreConsoleClick(step.id, TAIL_CONSOLE_LOG);
        }, POLL_INTERVAL);
      }
    } else if (appendInterval.current) {
      clearInterval(appendInterval.current);
      appendInterval.current = null;
    }
  }, [stickToBottom, step, logBuffer, onMoreConsoleClick]);

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
    <div role="log">
      {logBuffer.lines.map((content, index) => (
        <ConsoleLine
          key={index}
          lineNumber={String(index)}
          content={content}
          stepId={step.id}
          startByte={logBuffer.startByte}
        />
      ))}
    </div>
  );
}

export interface ConsoleLogStreamProps {
  logBuffer: StepLogBufferInfo;
  onMoreConsoleClick: (nodeId: string, startByte: number) => void;
  fetchExceptionText: (nodeId: string) => void;
  step: StepInfo;
  maxHeightScale: number;
}
