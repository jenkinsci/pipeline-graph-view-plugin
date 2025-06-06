import "./data-tree-view.scss";

import {
  memo,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Filter from "../../../common/components/filter.tsx";
import StatusIcon from "../../../common/components/status-icon.tsx";
import { classNames } from "../../../common/utils/classnames.ts";
import { Total } from "../../../common/utils/timings.tsx";
import {
  Result,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { useFilter } from "./providers/filter-provider.tsx";

export default function DataTreeView({
  stages,
  selected,
  onNodeSelect,
}: DataTreeViewProps) {
  const { search, setSearch, visibleStatuses } = useFilter();
  const filteredStages = filterStageTree(search, visibleStatuses, stages);

  const handleSelect = useCallback(
    (event: ReactMouseEvent, nodeId: string) => {
      onNodeSelect(event, nodeId);
    },
    [onNodeSelect],
  );

  if (stages.length === 1 && stages[0].placeholder) {
    return null;
  }

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

      <ol className={"pgv-tree"} role="tree" aria-label={"Pipeline Stages"}>
        {filteredStages.map((stage) => (
          <TreeNode
            key={stage.id}
            stage={stage}
            selected={String(selected)}
            onSelect={handleSelect}
          />
        ))}
      </ol>
    </div>
  );
}

const TreeNode = memo(function TreeNode({
  stage,
  selected,
  onSelect,
}: TreeNodeProps) {
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

  const handleToggleClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    if (hasSelectedDescendant(stage)) {
      setIsExpanded(true);
    }
  }, [selected]);

  useEffect(() => {
    if (search.length || !allVisible) {
      if (filterStageTree(search, visibleStatuses, [stage]).length !== 0) {
        setIsExpanded(true);
      }
    }
  }, [search, visibleStatuses, allVisible]);

  return (
    <li
      className="pgv-tree-stage"
      role={"treeitem"}
      {...(hasChildren ? { "aria-expanded": isExpanded } : {})}
      aria-selected={isSelected}
      aria-labelledby={`stage-${stage.id}-name`}
    >
      <div className="pgv-tree-item-container">
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
          className={classNames("pgv-tree-item", {
            "pgv-tree-item--active": isSelected,
            "pgv-tree-item--skeleton": stage.skeleton,
          })}
          aria-labelledby={`stage-${stage.id}-name`}
        >
          <div className={"pgv-tree-item__content"}>
            <div className="pgv-status-icon">
              <StatusIcon
                status={stage.state}
                percentage={stage.completePercent}
                skeleton={stage.skeleton}
              />
            </div>
            <div className={"pgv-tree-item__info"}>
              <div
                className="pgv-tree-item__name"
                id={`stage-${stage.id}-name`}
              >
                <span className={"jenkins-visually-hidden"}>Stage </span>
                {stage.name}
              </div>
              <div className="pgv-tree-item__description">
                <Total ms={stage.totalDurationMillis} />
              </div>
            </div>
          </div>
        </a>
        {hasChildren && (
          <button
            className={classNames("pgv-tree-item__toggle", {
              "pgv-tree-item__toggle--active": isExpanded,
            })}
            onClick={handleToggleClick}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${stage.name}`}
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
          <ol
            role={"group"}
            aria-label={`Stages in ${stage.name}`}
            className={"pgv-tree"}
          >
            {stage.children.map((child) => (
              <TreeNode
                key={child.id}
                stage={child}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          </ol>
        </div>
      )}
    </li>
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
  onNodeSelect: (event: ReactMouseEvent, nodeId: string) => void;
}

interface TreeNodeProps {
  stage: StageInfo;
  selected: string;
  onSelect: (event: ReactMouseEvent, id: string) => void;
}
