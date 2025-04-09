import React from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useCallback, useState, useEffect, useRef } from "react";
import { Result, StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";

import Button from "@mui/material/Button";

export interface ConsoleLogStreamProps {
  logBuffer: StepLogBufferInfo;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  step: StepInfo;
  maxHeightScale: number;
}

import { ConsoleLine } from "./ConsoleLine";

export default function ConsoleLogStream(props: ConsoleLogStreamProps) {
  const appendInterval = useRef<NodeJS.Timeout | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [stickToBottom, setStickToBottom] = useState(false);
  const [moveToBottom, setMoveToBottom] = useState(true);
  const showButtonInterval = useRef<NodeJS.Timeout | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [maxConsoleLineHeight, setMaxConsoleLineHeight] = useState(1);

  useEffect(() => {
    return () => {
      if (appendInterval.current) {
        clearInterval(appendInterval.current);
      }
      if (showButtonInterval.current) {
        clearTimeout(showButtonInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showButtonInterval.current) {
      clearTimeout(showButtonInterval.current);
    }
    if (!stickToBottom) {
      showButtonInterval.current = setTimeout(() => setShowButton(true), 500);
    } else {
      setShowButton(false);
    }
  }, [stickToBottom, setShowButton]);

  useEffect(() => {
    if (moveToBottom) {
      scrollListBottom();
      setMoveToBottom(false);
    }
  }, [moveToBottom]);

  const consoleLineHeightCallback = useCallback((height: number) => {
    if (height > maxConsoleLineHeight) {
      setMaxConsoleLineHeight(height);
    } else if (maxConsoleLineHeight == 1) {
      setMaxConsoleLineHeight(height);
    }
  }, []);

  const scrollListBottom = () => {
    if (virtuosoRef.current) {
      if (props.logBuffer.lines) {
        virtuosoRef.current?.scrollBy({
          // This needs to be large enough to cover even really long lines.
          // It doesn't need to worry about being too big.
          top: props.logBuffer.lines.length * 1000,
        });
      } else {
        console.debug("'logBuffer.lines' not set. Log empty, not scrolling.");
      }
    } else {
      console.warn("virtuosoRef is null, cannot scroll to index!");
    }
  };

  const shouldRequestMoreLogs = () => {
    return props.step.state === Result.running || props.logBuffer.startByte < 0;
  };

  const height = () => {
    const spinnerLines = shouldRequestMoreLogs() ? 2 : 0;
    return (props.logBuffer.lines.length + spinnerLines) * maxConsoleLineHeight;
  };

  return (
    <>
      <Virtuoso
        style={{
          height: `${height()}px`,
          maxHeight: window.innerHeight * props.maxHeightScale,
        }}
        ref={virtuosoRef}
        data={props.logBuffer.lines}
        components={{
          Footer: () => {
            return shouldRequestMoreLogs() ? (
              <div className="lds-ellipsis">
                <div></div>
                <div></div>
                <div></div>
              </div>
            ) : (
              <></>
            );
          },
        }}
        itemContent={(index: number, content: string) => {
          return (
            <ConsoleLine
              lineNumber={String(index)}
              content={content}
              stepId={props.step.id}
              startByte={props.logBuffer.startByte}
              heightCallback={consoleLineHeightCallback}
            />
          );
        }}
        atBottomStateChange={(bottom) => {
          if (appendInterval.current) {
            clearInterval(appendInterval.current);
          }
          console.debug(`'atBottomStateChange' called with '${bottom}'`);
          if (bottom && shouldRequestMoreLogs()) {
            console.debug(`Fetching more log text`);
            appendInterval.current = setInterval(() => {
              props.handleMoreConsoleClick(
                props.step.id,
                props.logBuffer.startByte,
              );
            }, 1000);
            console.debug(`Received more text '${bottom} - ${stickToBottom}'`);
          }
          console.debug(`Setting stickToBottom to '${bottom}'`);
          setStickToBottom(bottom);
        }}
        followOutput={(bottom) => {
          // This is a workaround as 'followOutput' isn't working for me - works in sandbox, but not nested inside Jenkins UI.
          setMoveToBottom(bottom);
          return false;
        }}
        // Uncomment to help with debugging virtuoso issues.
        //logLevel={LogLevel.DEBUG}
      />
      {/*{showButton && (*/}
      {/*  <Button*/}
      {/*    variant="text"*/}
      {/*    sx={{ padding: "0px", textTransform: "none" }}*/}
      {/*    onClick={() => scrollListBottom()}*/}
      {/*    style={{ float: "right", transform: "translate(-2rem, -2rem)" }}*/}
      {/*  >*/}
      {/*    Scroll to Bottom*/}
      {/*  </Button>*/}
      {/*)}*/}
    </>
  );
}
