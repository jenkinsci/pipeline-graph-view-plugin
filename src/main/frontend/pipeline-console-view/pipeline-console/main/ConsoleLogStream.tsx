import { useEffect, useRef, useState } from "react";

import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

export default function ConsoleLogStream({
  step,
  logBuffer,
  onMoreConsoleClick,
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
    if (stickToBottom && logBuffer.lines.length > 0) {
      // Scroll to bottom of the log stream
      if (logBuffer.lines) {
        requestAnimationFrame(() => {
          const scrollTarget = document.documentElement.scrollHeight;
          window.scrollTo({ top: scrollTarget });
        });
      }
    }
  }, [stickToBottom, logBuffer.lines]);

  useEffect(() => {
    const handleScroll = () => {
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
      step.state === Result.running || logBuffer.startByte < 0;

    if (stickToBottom && shouldRequestMoreLogs) {
      if (!appendInterval.current) {
        appendInterval.current = window.setInterval(() => {
          onMoreConsoleClick(step.id, logBuffer.startByte);
        }, 1000);
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
  step: StepInfo;
  maxHeightScale: number;
}
