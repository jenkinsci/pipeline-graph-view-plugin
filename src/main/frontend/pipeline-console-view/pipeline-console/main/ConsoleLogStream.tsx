import { useEffect, useRef, useState } from "react";

import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

export default function ConsoleLogStream(props: ConsoleLogStreamProps) {
  const appendInterval = useRef<NodeJS.Timeout | null>(null);
  const [stickToBottom, setStickToBottom] = useState(false);

  useEffect(() => {
    return () => {
      if (appendInterval.current) {
        clearInterval(appendInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stickToBottom && props.logBuffer.lines.length > 0) {
      // Scroll to bottom of the log stream
      if (props.logBuffer.lines) {
        requestAnimationFrame(() => {
          const scrollTarget = document.documentElement.scrollHeight;
          window.scrollTo({ top: scrollTarget });
        });
      }
    }
  }, [props.logBuffer.lines]);

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
    if (stickToBottom && shouldRequestMoreLogs()) {
      if (!appendInterval.current) {
        appendInterval.current = setInterval(() => {
          props.onMoreConsoleClick(props.step.id, props.logBuffer.startByte);
        }, 1000);
      }
    } else if (appendInterval.current) {
      clearInterval(appendInterval.current);
      appendInterval.current = null;
    }
  }, [stickToBottom, props.step, props.logBuffer]);

  const shouldRequestMoreLogs = () => {
    return props.step.state === Result.running || props.logBuffer.startByte < 0;
  };

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
      {props.logBuffer.lines.map((content, index) => (
        <ConsoleLine
          key={index}
          lineNumber={String(index)}
          content={content}
          stepId={props.step.id}
          startByte={props.logBuffer.startByte}
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
