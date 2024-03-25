import React from "react";
import { useEffect, useRef } from "react";
import { makeReactChildren, tokenizeANSIString } from "./Ansi";

export interface ConsoleLineProps {
  lineNumber: string;
  content: string;
  stepId: string;
  startByte: number;
  heightCallback: (height: number) => void;
}

// Console output line
export const ConsoleLine = (props: ConsoleLineProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const height = ref.current ? ref.current.getBoundingClientRect().height : 0;
    props.heightCallback(height);
  }, []);

  return (
    <pre
      className="console-output-line"
      key={`console-line-pre${props.lineNumber}`}
    >
      <div
        className="console-output-line-anchor"
        id={`log-${props.lineNumber}`}
        key={`${props.lineNumber}-anchor`}
      />
      <div
        className="console-output-line"
        key={`${props.lineNumber}-body`}
        ref={ref}
      >
        <a
          className="console-line-number"
          href={`?start-byte=${props.startByte}&selected-node=${props.stepId}#log-${props.lineNumber}`} //`}
        >
          {props.lineNumber}
        </a>
        <div className="console-text">
          {makeReactChildren(
            tokenizeANSIString(props.content),
            `${props.stepId}-${props.lineNumber}`
          )}
        </div>
      </div>
    </pre>
  );
};
