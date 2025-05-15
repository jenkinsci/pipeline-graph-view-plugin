import { useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  Result,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";

export default function ConsoleLogStream(props: ConsoleLogStreamProps) {
  const appendInterval = useRef<NodeJS.Timeout | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [stickToBottom, setStickToBottom] = useState(false);
  const [maxConsoleLineHeight, setMaxConsoleLineHeight] = useState(1);

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
      if (virtuosoRef.current && props.logBuffer.lines) {
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

  const consoleLineHeightCallback = useCallback(
    (height: number) => {
      if (height > maxConsoleLineHeight || maxConsoleLineHeight === 1) {
        setMaxConsoleLineHeight(height);
      }
    },
    [maxConsoleLineHeight],
  );

  const shouldRequestMoreLogs = () => {
    return props.step.state === Result.running || props.logBuffer.startByte < 0;
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#log-")) {
      return;
    }
    const lineNumber = parseInt(hash.substring(5));
    if (!(!isNaN(lineNumber) && virtuosoRef.current)) {
      return;
    }
    virtuosoRef.current.scrollToIndex({
      index: lineNumber,
      align: "center",
    });
  }, []);

  return (
    <Virtuoso
      useWindowScroll
      ref={virtuosoRef}
      data={props.logBuffer.lines}
      role={"log"}
      itemContent={(index: number, content: string) => (
        <ConsoleLine
          lineNumber={String(index)}
          content={content}
          stepId={props.step.id}
          startByte={props.logBuffer.startByte}
          heightCallback={consoleLineHeightCallback}
        />
      )}
    />
  );
}

export interface ConsoleLogStreamProps {
  logBuffer: StepLogBufferInfo;
  onMoreConsoleClick: (nodeId: string, startByte: number) => void;
  step: StepInfo;
  maxHeightScale: number;
}
