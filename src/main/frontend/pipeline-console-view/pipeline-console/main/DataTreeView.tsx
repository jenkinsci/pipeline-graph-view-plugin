import React, { useCallback, useState } from "react";
import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/";
import "./data-tree-view.scss";
import StatusIcon from "../../../common/status-icon";
import { total } from "../../../common/timings";

export default function DataTreeView({
  stages,
  selected,
  onNodeSelect,
}: DataTreeViewProps) {
  const handleSelect = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      onNodeSelect(event, nodeId);
    },
    [onNodeSelect],
  );

  return (
    <div id="tasks">
      {stages.map((stage) => (
        <TreeNode
          key={stage.id}
          stage={stage}
          selected={selected}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

function TreeNode({ stage, selected, onSelect }: TreeNodeProps) {
  const hasChildren = stage.children && stage.children.length > 0;
  const isSelected = String(stage.id) === selected;
  const [isExpanded, setIsExpanded] = useState<boolean>(
    hasSelectedDescendant(stage),
  );

  function hasSelectedDescendant(stage: StageInfo): boolean {
    return stage.children?.some(
      (child) => String(child.id) === selected || hasSelectedDescendant(child),
    );
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="task">
      <div className="pgv-tree-node-header">
        <a
          href={`?selected-node=` + stage.id}
          onClick={(e) => {
            // Only prevent left clicks
            if (e.button !== 0 || e.metaKey || e.ctrlKey) {
              return;
            }

            e.preventDefault();

            history.replaceState({}, "", `?selected-node=` + stage.id);
            if (!isSelected) {
              onSelect(e, String(stage.id));
            }
            setIsExpanded(!isExpanded);
          }}
          className={`pgv-tree-item task-link ${
            isSelected ? "task-link--active" : ""
          }`}
        >
          <div>
            <span className="task-icon-link">
              <StatusIcon
                status={stage.state}
                percentage={stage.completePercent}
                skeleton={stage.skeleton}
              />
            </span>
            <span className="task-link-text">{stage.name}</span>
            {stage.state === Result.running && (
              <span className="pgv-tree-item__description">
                {total(stage.totalDurationMillis)}
              </span>
            )}
          </div>
        </a>

        {hasChildren && (
          <button
            className={`pgv-toggle-icon ${
              isExpanded ? "pgv-toggle-icon--active" : ""
            }`}
            onClick={handleToggleClick}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="48"
                d="M184 112l144 144-144 144"
              />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="pgv-tree-children">
          {stage.children.map((child) => (
            <TreeNode
              key={child.id}
              stage={child}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DataTreeViewProps {
  stages: StageInfo[];
  selected: string;
  onNodeSelect: (event: React.MouseEvent, nodeId: string) => void;
}

interface TreeNodeProps {
  stage: StageInfo;
  selected: string;
  onSelect: (event: React.MouseEvent, id: string) => void;
}
