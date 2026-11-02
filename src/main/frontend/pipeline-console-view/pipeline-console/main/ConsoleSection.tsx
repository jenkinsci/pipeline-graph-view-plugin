import { memo, useLayoutEffect, useRef, useState } from "react";

import {
  LocalizedMessageKey,
  useMessages,
} from "../../../common/i18n/index.ts";
import { BuildStep } from "../../../common/RestClient.tsx";
import { makeReactChildren, tokenizeANSIString } from "./Ansi.tsx";
import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  ConsoleSectionGroup,
  ConsoleSectionNode,
} from "./parseConsoleSections.ts";
import { sanitizeConsoleHtml } from "./sanitizeConsoleHtml.ts";

/** Closed sections with more lines than this start collapsed. */
const COLLAPSE_THRESHOLD = 25;

interface SharedProps {
  stepId: string;
  startByte: number;
  stopTailingLogs: () => void;
  currentRunPath: string;
  buildStep?: BuildStep;
}

export interface ConsoleSectionProps extends SharedProps {
  group: ConsoleSectionGroup;
}

export const ConsoleSection = memo(function ConsoleSection({
  group,
  ...shared
}: ConsoleSectionProps) {
  const messages = useMessages();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const userToggled = useRef(false);
  const collapse =
    group.endIndex !== -1 && group.lineCount > COLLAPSE_THRESHOLD;
  // Only the initial value is applied; afterwards the browser owns the open
  // state, so find-in-page and deep links can expand the section natively.
  const [initiallyOpen] = useState(!collapse);

  // A section that finishes while it is being tailed collapses like one that
  // was already finished on load, unless the user has toggled it or it holds
  // the deep-linked line. Running before the parent's scroll-to-tail layout
  // effect keeps the height change from looking like a user scroll.
  useLayoutEffect(() => {
    const details = detailsRef.current;
    if (!collapse || userToggled.current || !details) return;
    if (details.querySelector(":target")) return;
    details.open = false;
  }, [collapse]);

  return (
    <details
      ref={detailsRef}
      open={initiallyOpen}
      className="pgv-console-section"
    >
      <summary
        className="pgv-console-section__summary"
        onClick={() => {
          userToggled.current = true;
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="pgv-console-section__chevron"
          aria-hidden="true"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="48"
            d="M184 112l144 144-144 144"
          />
        </svg>
        <span className="pgv-console-section__title">
          {group.title
            ? makeReactChildren(
                tokenizeANSIString(sanitizeConsoleHtml(group.title)),
                `section-title-${group.startIndex}`,
              )
            : messages.format(LocalizedMessageKey.consoleSectionUntitled)}
        </span>
        <span className="pgv-console-section__count">
          {messages.format(LocalizedMessageKey.consoleSectionLines, {
            0: group.lineCount,
          })}
        </span>
      </summary>
      {group.children.map((node) => (
        <ConsoleSectionNodeRenderer
          key={nodeKey(node)}
          node={node}
          {...shared}
        />
      ))}
    </details>
  );
});

export interface ConsoleSectionNodeRendererProps extends SharedProps {
  node: ConsoleSectionNode;
}

export const ConsoleSectionNodeRenderer = memo(
  function ConsoleSectionNodeRenderer({
    node,
    ...shared
  }: ConsoleSectionNodeRendererProps) {
    if (node.kind === "line") {
      return (
        <ConsoleLine
          lineNumber={String(node.index)}
          content={node.content}
          {...shared}
        />
      );
    }
    return <ConsoleSection group={node} {...shared} />;
  },
);

export function nodeKey(node: ConsoleSectionNode): string {
  return node.kind === "line"
    ? `line-${node.index}`
    : `section-${node.startIndex}`;
}
