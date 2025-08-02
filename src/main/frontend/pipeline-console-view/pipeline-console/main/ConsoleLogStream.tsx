import { useEffect, useRef, useState } from "react";

import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

function canStickToBottom() {
  // Avoid scrolling to the bottom when a log line is focussed.
  return !window.location.hash.startsWith("#log-");
}

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

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#log-")) {
      return;
    }
    const lineNumber = parseInt(hash.substring(5));
    if (!isNaN(lineNumber)) {
      const element = document.getElementById(`log-${lineNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        const hash = location.hash;
        location.hash = "";
        location.hash = hash;
      }
    }
  }, []);

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
