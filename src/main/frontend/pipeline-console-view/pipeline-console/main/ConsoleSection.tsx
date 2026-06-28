import { memo, useState } from "react";

import { BuildStep } from "../../../common/RestClient.tsx";
import { makeReactChildren, tokenizeANSIString } from "./Ansi.tsx";
import { ConsoleLine } from "./ConsoleLine.tsx";
import {
  ConsoleSectionGroup,
  ConsoleSectionNode,
} from "./parseConsoleSections.ts";

/** Sections with more children than this default to collapsed. */
const COLLAPSE_THRESHOLD = 25;

export interface ConsoleSectionProps {
  group: ConsoleSectionGroup;
  stepId: string;
  startByte: number;
  stopTailingLogs: () => void;
  currentRunPath: string;
  buildStep?: BuildStep;
}

export const ConsoleSection = memo(function ConsoleSection({
  group,
  stepId,
  startByte,
  stopTailingLogs,
  currentRunPath,
  buildStep,
}: ConsoleSectionProps) {
  // Unclosed groups (still streaming) default to open.
  // Closed groups with many children default to collapsed.
  const [open, setOpen] = useState(
    group.endIndex === -1 || group.children.length <= COLLAPSE_THRESHOLD,
  );

  return (
    <details
      open={open}
      onToggle={(e) => {
        e.stopPropagation();
        const isOpen = (e.target as HTMLDetailsElement).open;
        if (isOpen !== open) {
          setOpen(isOpen);
        }
      }}
      className="pgv-console-section"
    >
      <summary
        className="pgv-console-section__summary"
        onClick={(e) => {
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="pgv-console-section__chevron"
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
        <div className="pgv-console-section__title">
          {makeReactChildren(
            tokenizeANSIString(group.title),
            `section-title-${group.startIndex}`,
          )}
        </div>
        <span className="pgv-console-section__count">
          {group.children.length}{" "}
          {group.children.length === 1 ? "line" : "lines"}
        </span>
      </summary>
      {open && (
        <div className="pgv-console-section__body">
          {group.children.map((node) => (
            <ConsoleSectionNodeRenderer
              key={nodeKey(node)}
              node={node}
              stepId={stepId}
              startByte={startByte}
              stopTailingLogs={stopTailingLogs}
              currentRunPath={currentRunPath}
              buildStep={buildStep}
            />
          ))}
        </div>
      )}
    </details>
  );
});

export interface ConsoleSectionNodeRendererProps {
  node: ConsoleSectionNode;
  stepId: string;
  startByte: number;
  stopTailingLogs: () => void;
  currentRunPath: string;
  buildStep?: BuildStep;
}

export const ConsoleSectionNodeRenderer = memo(
  function ConsoleSectionNodeRenderer({
    node,
    stepId,
    startByte,
    stopTailingLogs,
    currentRunPath,
    buildStep,
  }: ConsoleSectionNodeRendererProps) {
    if (node.kind === "line") {
      return (
        <ConsoleLine
          key={`line-${node.index}`}
          lineNumber={String(node.index)}
          content={node.content}
          stepId={stepId}
          startByte={startByte}
          stopTailingLogs={stopTailingLogs}
          currentRunPath={currentRunPath}
          buildStep={buildStep}
        />
      );
    }
    return (
      <ConsoleSection
        key={`section-${node.startIndex}`}
        group={node}
        stepId={stepId}
        startByte={startByte}
        stopTailingLogs={stopTailingLogs}
        currentRunPath={currentRunPath}
        buildStep={buildStep}
      />
    );
  },
);

function nodeKey(node: ConsoleSectionNode): string {
  return node.kind === "line"
    ? `line-${node.index}`
    : `section-${node.startIndex}`;
}
