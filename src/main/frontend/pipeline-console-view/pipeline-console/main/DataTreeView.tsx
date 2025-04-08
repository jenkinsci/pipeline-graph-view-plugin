import React, { useState, useCallback } from "react";
import { StageInfo } from "../../../pipeline-graph-view/pipeline-graph/main/";
import StepStatus from "../../../step-status/StepStatus";
import "./data-tree-view.scss";

export interface DataTreeViewProps {
  stages: StageInfo[];
  selected: string;
  onNodeSelect: (event: React.MouseEvent, nodeId: string) => void;
}

const TreeNode: React.FC<{
  stage: StageInfo;
  selected: string;
  onSelect: (event: React.MouseEvent, id: string) => void;
}> = ({ stage, selected, onSelect }) => {
  const hasChildren = stage.children && stage.children.length > 0;
  const isSelected = String(stage.id) === selected;
  const anyChildrenSelected = isSelected || stage.children.some((item) => String(item.id) === selected);

  return (
    <div className="task">
      <div className="tree-node-header">
        <button
          onClick={(e) => onSelect(e, String(stage.id))}
          className={`pgv-tree-item task-link ${
            isSelected ? "task-link--active" : ""
          }`}
        >
          <StepStatus
            status={stage.state}
            text={stage.name}
            key={`status-${stage.id}`}
            percent={stage.completePercent}
            radius={10}
          />
          {hasChildren && (
            <span
              className={`pgv-toggle-icon ${
                anyChildrenSelected ? "pgv-toggle-icon--active" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
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
            </span>
          )}
        </button>
      </div>
      {hasChildren && anyChildrenSelected && (
        <div className="tree-children">
          {stage.children!.map((child) => (
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
};

export default function DataTreeView({
                                                     stages,
                                                     selected,
                                                     onNodeSelect,
                                                   }: DataTreeViewProps)  {
  const handleSelect = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      onNodeSelect(event, nodeId);
    },
    [onNodeSelect]
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
};
