import React, { useCallback, useState } from "react";
import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/";
import StepStatus from "../../../step-status/StepStatus";
import "./data-tree-view.scss";

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
    <div className="custom-tree-view" id="tasks">
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
      <div className="tree-node-header">
        <button
          onClick={(e) => {
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
            <StepStatus
              status={stage.state}
              text={stage.name}
              key={`status-${stage.id}`}
              percent={stage.completePercent}
              radius={10}
            />
            {stage.state === Result.running && (
              <span style={{ color: "var(--text-color-secondary)" }}>
                {stage.totalDurationMillis}
              </span>
            )}
          </div>
        </button>

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
        <div className="tree-children">
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
