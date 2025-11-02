import linkifyHtml from "linkify-html";
import { memo } from "react";

import { linkifyJsOptions } from "../../../common/utils/linkify-js.ts";
import { makeReactChildren, tokenizeANSIString } from "./Ansi.tsx";

export interface ConsoleLineProps {
  stopTailingLogs: () => void;
  lineNumber: string;
  content: string;
  stepId: string;
  startByte: number;
}

// Console output line
export const ConsoleLine = memo(function ConsoleLine(props: ConsoleLineProps) {
  const baseURL = `?start-byte=${props.startByte}&selected-node=${props.stepId}`;
  const id = `log-${props.stepId}-${props.lineNumber}`;
  return (
    <pre
      style={{ background: "none", border: "none" }}
      className="console-output-line"
    >
      <div className="console-output-line">
        <a
          className="console-line-number"
          id={id}
          href={`${baseURL}#${id}`}
          onClick={() => {
            props.stopTailingLogs();
            // Avoid an actual page navigation by swapping the current URL for
            // the baseURL (query without hash) before the default "click"
            // behavior (the browsers page navigation logic) runs. The
            // effective navigation is a swap of the hash, which merely updates
            // the style and scroll position. The page state (opened/collapsed
            // steps and fetched logs) is retained.
            history.replaceState({}, "", baseURL);
          }}
          style={{
            width: Math.max(9 * String(props.lineNumber).length, 30) + "px",
          }}
        >
          {props.lineNumber}
        </a>
        <div className="console-text">
          {makeReactChildren(
            tokenizeANSIString(linkifyHtml(props.content, linkifyJsOptions)),
            id,
          )}
        </div>
      </div>
    </pre>
  );
});
