import React, { useCallback, useEffect, useState } from "react";
import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/";
import "./data-tree-view.scss";
import { Total } from "../../../common/utils/timings";
import StatusIcon from "../../../common/components/status-icon";
import { classNames } from "../../../common/utils/classnames";
import Filter from "../../../common/components/filter";
import { useFilter } from "./providers/filter-provider";

export default function DataTreeView({
  stages,
  selected,
  onNodeSelect,
}: DataTreeViewProps) {
  const { search, setSearch, visibleStatuses } = useFilter();
  const filteredStages = filterStageTree(search, visibleStatuses, stages);

  const handleSelect = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      onNodeSelect(event, nodeId);
    },
    [onNodeSelect],
  );

  return (
    <div>
      <div className={"pgw-filter-bar"}>
        <div className="jenkins-search">
          <div className="jenkins-search__icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path
                d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="32"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeMiterlimit="10"
                strokeWidth="32"
                d="M338.29 338.29L448 448"
              />
            </svg>
          </div>
          <input
            className="jenkins-input jenkins-search__input"
            placeholder="Search"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Filter />
      </div>

      {filteredStages.length === 0 && (
        <div className={"jenkins-notice"}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={36}
              d="M32 144h448M112 256h288M208 368h96"
            />
          </svg>
          <div>No stages</div>
        </div>
      )}

      <div id="tasks" style={{ marginLeft: "0.7rem" }}>
        {filteredStages.map((stage) => (
          <TreeNode
            key={stage.id}
            stage={stage}
            selected={String(selected)}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

const TreeNode = React.memo(({ stage, selected, onSelect }: TreeNodeProps) => {
  const { search, visibleStatuses, allVisible } = useFilter();
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

  useEffect(() => {
    if (search.length || !allVisible) {
      if (filterStageTree(search, visibleStatuses, [stage]).length !== 0) {
        setIsExpanded(true);
      }
    }
  }, [search, visibleStatuses, allVisible]);

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
          className={classNames("pgv-tree-item", "task-link", {
            "task-link--active": isSelected,
            "pgv-tree-item--skeleton": stage.skeleton,
          })}
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
                <Total ms={stage.totalDurationMillis} />
              </span>
            )}
          </div>
        </a>

        {hasChildren && (
          <button
            className={classNames("pgv-toggle-icon", {
              "pgv-toggle-icon--active": isExpanded,
            })}
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
});

const filterStageTree = (
  search: string,
  visibleStatuses: Result[],
  stages: StageInfo[],
): StageInfo[] => {
  return stages
    .map((stage) => {
      const filteredChildren = stage.children
        ? filterStageTree(search, visibleStatuses, stage.children)
        : [];

      const matchesSelf =
        stage.name.toLowerCase().includes(search.toLowerCase()) &&
        visibleStatuses.includes(stage.state);

      // Include this stage if it matches or has matching children
      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...stage,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter((stage) => stage !== null);
};

interface DataTreeViewProps {
  stages: StageInfo[];
  selected?: number;
  onNodeSelect: (event: React.MouseEvent, nodeId: string) => void;
}

interface TreeNodeProps {
  stage: StageInfo;
  selected: string;
  onSelect: (event: React.MouseEvent, id: string) => void;
}
