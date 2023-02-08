import React from "react";

import { makeReactChildren, tokenizeANSIString } from "./Ansi";

export interface ConsoleLineProps {
  lineNumber: string;
  content: string;
  stepId: string;
  key: string;
}

// Console output line
export const ConsoleLine = (props: ConsoleLineProps) => (
  <div className="console-output-item" key={props.lineNumber}>
    <div
      className="console-output-line-anchor"
      id={`log-${props.lineNumber}`}
      key={`${props.lineNumber}-anchor`}
    />
    <div className="console-output-line" key={`${props.lineNumber}-body`}>
      <a
        className="console-line-number"
        href={`?selected-node=${props.stepId}#log-${props.lineNumber}`}
      >
        {props.lineNumber}
      </a>
      {makeReactChildren(
        tokenizeANSIString(props.content),
        `${props.stepId}-${props.lineNumber}`
      )}
    </div>
  </div>
);