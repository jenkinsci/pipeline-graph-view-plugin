import React from "react";
import { Virtuoso, VirtuosoHandle, LogLevel } from "react-virtuoso";
import { useState, useEffect, useRef } from "react";
import { StepLogBufferInfo } from "./PipelineConsoleModel";

import Button from "@mui/material/Button";

interface ConsoleLogStreamProps {
  logBuffer: StepLogBufferInfo;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  stepId: string;
}

import { ConsoleLine } from "./ConsoleLine";

export default function ConsoleLogStream(props: ConsoleLogStreamProps) {
  const appendInterval = useRef<NodeJS.Timeout | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [stickToBottom, setStickToBottom] = useState(false);
  const [moveToBottom, setMoveToBottom] = useState(true);
  const showButtonInterval = useRef<NodeJS.Timeout | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    return () => {
      if (appendInterval.current) {
        clearInterval(appendInterval.current);
      }
      if (showButtonInterval.current)
        [clearTimeout(showButtonInterval.current)];
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

  const scrollListBottom = () => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollBy({
        top: props.logBuffer.consoleLines.length * 50,
      });
    } else {
      console.log(`Ref is null, cannot scroll to index!`);
    }
  };

  return (
    <>
      <Virtuoso
        style={{
          height: props.logBuffer.consoleLines.length * 22,
          maxHeight: window.outerHeight / 2,
        }}
        ref={virtuosoRef}
        data={props.logBuffer.consoleLines}
        itemContent={(index: number, content: string) => {
          return (
            <ConsoleLine
              lineNumber={String(index)}
              content={content}
              stepId={props.stepId}
              startByte={props.logBuffer.consoleStartByte}
            />
          );
        }}
        atBottomStateChange={(bottom) => {
          if (appendInterval.current) {
            clearInterval(appendInterval.current);
          }
          console.log(`'atBottomStateChange' called with '${bottom}'`);
          if (bottom) {
            console.log(`Fetching more log text`);
            appendInterval.current = setInterval(() => {
              props.handleMoreConsoleClick(
                props.stepId,
                props.logBuffer.consoleStartByte
              );
            }, 1000);
            console.log(`Received more text '${bottom} - ${stickToBottom}'`);
          }
          console.log(`Setting stickToBottom to '${bottom}'`);
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
      {showButton && (
        <Button
          variant="text"
          sx={{ padding: "0px", textTransform: "none" }}
          onClick={() => scrollListBottom()}
          style={{ float: "right", transform: "translate(-1rem, -2rem)" }}
        >
          Scroll to Bottom
        </Button>
      )}
    </>
  );
}
