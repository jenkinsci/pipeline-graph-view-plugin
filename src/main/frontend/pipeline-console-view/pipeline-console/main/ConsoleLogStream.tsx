import React, { useCallback, useState, useEffect, useRef } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Result, StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { ConsoleLine } from "./ConsoleLine";
import "./console-log-stream.scss";

export default function ConsoleLogStream(props: ConsoleLogStreamProps) {
  const appendInterval = useRef<NodeJS.Timeout | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
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
      scrollListBottom();
    }
  }, [props.logBuffer.lines]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.body.scrollHeight;
      const isAtBottom = pageHeight - scrollPosition < 100;

      setStickToBottom(isAtBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (stickToBottom && shouldRequestMoreLogs()) {
      if (!appendInterval.current) {
        appendInterval.current = setInterval(() => {
          props.handleMoreConsoleClick(
            props.step.id,
            props.logBuffer.startByte
          );
        }, 1000);
      }
    } else if (appendInterval.current) {
      clearInterval(appendInterval.current);
      appendInterval.current = null;
    }
  }, [stickToBottom, props.step, props.logBuffer]);

  const consoleLineHeightCallback = useCallback((height: number) => {
    if (height > maxConsoleLineHeight || maxConsoleLineHeight === 1) {
      setMaxConsoleLineHeight(height);
    }
  }, [maxConsoleLineHeight]);

  const scrollListBottom = () => {
    if (virtuosoRef.current && props.logBuffer.lines) {
      requestAnimationFrame(() => {
        const scrollTarget = document.documentElement.scrollHeight;
        window.scrollTo({ top: scrollTarget, behavior: "smooth" });
      });
    } else {
      console.debug("Log buffer is empty or virtuosoRef is not available.");
    }
  };

  const shouldRequestMoreLogs = () => {
    return props.step.state === Result.running || props.logBuffer.startByte < 0;
  };

  return (
    <Virtuoso
      useWindowScroll
      ref={virtuosoRef}
      data={props.logBuffer.lines}
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
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  step: StepInfo;
  maxHeightScale: number;
}