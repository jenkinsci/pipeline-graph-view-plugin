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
  /** Never auto-collapse, e.g. the section a failed step ended in. */
  keepOpen?: boolean;
}

export const ConsoleSection = memo(function ConsoleSection({
  group,
  keepOpen = false,
  ...shared
}: ConsoleSectionProps) {
  const messages = useMessages();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const userToggled = useRef(false);
  const collapse =
    !keepOpen && group.endIndex !== -1 && group.lineCount > COLLAPSE_THRESHOLD;
  // Only the initial value is applied; afterwards the browser owns the open
  // state, so find-in-page and deep links can expand the section natively.
  const [initiallyOpen] = useState(!collapse);

  // The open state follows `collapse` as it changes (a section finishing while
  // tailed, or its step failing) unless the user has toggled the section or
  // it holds the deep-linked line. Running before the parent's scroll-to-tail
  // layout effect keeps the height change from looking like a user scroll.
  useLayoutEffect(() => {
    const details = detailsRef.current;
    if (!details || userToggled.current) return;
    if (collapse && details.querySelector(":target")) return;
    details.open = !collapse;
  }, [collapse]);

  return (
    <details
      ref={detailsRef}
      open={initiallyOpen}
      className="pgv-console-section"
    >
      {/* The marker lines are not rendered, so their line anchors live on the
          summary and an empty element after the children. */}
      <summary
        id={`log-${shared.stepId}-${group.startIndex}`}
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
      <ConsoleSectionNodes
        nodes={group.children}
        keepLastSectionOpen={keepOpen}
        {...shared}
      />
      {group.endIndex !== -1 && (
        <span id={`log-${shared.stepId}-${group.endIndex}`} />
      )}
    </details>
  );
});

export interface ConsoleSectionNodesProps extends SharedProps {
  nodes: ConsoleSectionNode[];
  /** Pass `keepOpen` to the last section among `nodes`. */
  keepLastSectionOpen: boolean;
}

export function ConsoleSectionNodes({
  nodes,
  keepLastSectionOpen,
  ...shared
}: ConsoleSectionNodesProps) {
  let lastSection = -1;
  if (keepLastSectionOpen) {
    for (let i = nodes.length - 1; i >= 0 && lastSection === -1; i--) {
      if (nodes[i].kind === "group") lastSection = i;
    }
  }
  return nodes.map((node, i) =>
    node.kind === "line" ? (
      <ConsoleLine
        key={`line-${node.index}`}
        lineNumber={String(node.index)}
        content={node.content}
        {...shared}
      />
    ) : (
      <ConsoleSection
        key={`section-${node.startIndex}`}
        group={node}
        keepOpen={i === lastSection}
        {...shared}
      />
    ),
  );
}
