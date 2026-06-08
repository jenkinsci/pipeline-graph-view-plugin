import "./split-view.scss";

import {
  Children,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { classNames } from "../../../common/utils/classnames.ts";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";

export default function SplitView(props: SplitViewNewProps) {
  const {
    setTreeViewWidth,
    setStageViewWidth,
    setStageViewHeight,
    setBuildFlowHeight,
    treeViewWidth,
    stageViewWidth,
    stageViewHeight,
    buildFlowHeight,
    buildFlowCollapsed,
    setBuildFlowCollapsed,
  } = useLayoutPreferences();

  const {
    direction = "horizontal",
    storageKey,
    collapsible,
    collapseLabel,
  } = props;
  const [isDragging, setIsDragging] = useState(false);

  const isVertical = direction === "vertical";
  const isCollapsed = collapsible && buildFlowCollapsed;

  const getSizeForKey = () => {
    if (storageKey === "stages") return treeViewWidth;
    if (storageKey === "graph") {
      return isVertical ? stageViewHeight : stageViewWidth;
    }
    if (storageKey === "buildFlow") return buildFlowHeight;
    return 300;
  };

  const [panelSize, setPanelSize] = useState<number>(getSizeForKey);

  useEffect(() => {
    setPanelSize(getSizeForKey());
  }, [
    direction,
    treeViewWidth,
    stageViewWidth,
    stageViewHeight,
    buildFlowHeight,
    storageKey,
  ]);

  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDragging = (e: ReactMouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const stopDragging = () => setIsDragging(false);

  const getContainerOffset = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return isVertical ? rect.top : rect.left;
    }
    return 0;
  };

  const persistSize = (size: number) => {
    if (storageKey === "stages") {
      setTreeViewWidth(size);
    } else if (storageKey === "graph") {
      if (isVertical) {
        setStageViewHeight(size);
      } else {
        setStageViewWidth(size);
      }
    } else if (storageKey === "buildFlow") {
      setBuildFlowHeight(size);
    }
  };

  const handleDragging = (e: MouseEvent) => {
    if (!isDragging) return;

    const newSize = isVertical
      ? e.clientY - getContainerOffset()
      : e.clientX - getContainerOffset();

    const clampedSize = Math.max(
      isVertical ? 100 : 200,
      Math.min(newSize, 1500),
    );
    setPanelSize(clampedSize);
    persistSize(clampedSize);
  };

  const handleDoubleClick = () => {
    const resetSize = (() => {
      if (storageKey === "stages") return 300;
      if (storageKey === "graph") return isVertical ? 250 : 600;
      if (storageKey === "buildFlow") return 0;
      return 300;
    })();

    setPanelSize(resetSize);
    persistSize(resetSize);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleDragging);
    window.addEventListener("mouseup", stopDragging);
    return () => {
      window.removeEventListener("mousemove", handleDragging);
      window.removeEventListener("mouseup", stopDragging);
    };
  });

  const childrenArray = Children.toArray(props.children).filter(Boolean);
  if (childrenArray.length === 1) {
    return <>{childrenArray[0]}</>;
  }

  if (isCollapsed) {
    return (
      <div className="pgv-split-view__container">
        <button
          className="pgv-split-view__collapse-toggle"
          onClick={() => setBuildFlowCollapsed(false)}
          aria-expanded={false}
          aria-label={`Expand ${collapseLabel || "panel"}`}
        >
          <ChevronIcon collapsed />
          {collapseLabel || "Panel"}
        </button>
        {childrenArray[1]}
      </div>
    );
  }

  const gridTemplate =
    storageKey === "buildFlow" && panelSize === 0
      ? "1fr 1fr"
      : `${panelSize}px 1fr`;

  return (
    <div
      ref={containerRef}
      className="pgv-split-view__container"
      style={{
        display: "grid",
        gridTemplateColumns: isVertical ? undefined : gridTemplate,
        gridTemplateRows: isVertical ? gridTemplate : undefined,
      }}
    >
      <div
        className={classNames("pgv-split-view__side-panel", {
          "pgv-split-view__side-panel--vertical": isVertical,
        })}
      >
        {collapsible && (
          <button
            className="pgv-split-view__collapse-toggle pgv-split-view__collapse-toggle--inline"
            onClick={() => setBuildFlowCollapsed(true)}
            aria-expanded={true}
            aria-label={`Collapse ${collapseLabel || "panel"}`}
          >
            <ChevronIcon />
            {collapseLabel || "Panel"}
          </button>
        )}
        {childrenArray[0]}
        <div
          ref={dividerRef}
          onMouseDown={startDragging}
          onDoubleClick={handleDoubleClick}
          className={classNames("pgv-split-view__divider", {
            "pgv-split-view__divider--vertical": isVertical,
          })}
        />
      </div>
      <div>{childrenArray[1]}</div>
    </div>
  );
}

const ChevronIcon = ({ collapsed }: { collapsed?: boolean }) => (
  <svg
    className={classNames("pgv-split-view__collapse-chevron", {
      "pgv-split-view__collapse-chevron--collapsed": collapsed,
    })}
    viewBox="0 0 16 16"
    width="16"
    height="16"
  >
    <path
      fill="currentColor"
      d="M4.957 2.513a.75.75 0 0 1 1.056-.07l4.5 4a.75.75 0 0 1 0 1.114l-4.5 4a.75.75 0 0 1-.996-1.114L8.944 7 5.027 3.57a.75.75 0 0 1-.07-1.057z"
    />
  </svg>
);

interface SplitViewNewProps {
  children: ReactNode[];
  direction?: "horizontal" | "vertical";
  storageKey: "stages" | "graph" | "buildFlow";
  /** Enable collapse/expand toggle on the first child pane */
  collapsible?: boolean;
  /** Label shown in the collapse toggle button */
  collapseLabel?: string;
}
