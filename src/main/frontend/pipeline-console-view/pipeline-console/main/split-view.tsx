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
import { defaultLayout } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";

export default function SplitView(props: SplitViewNewProps) {
  const {
    setTreeViewWidth,
    setStageViewWidth,
    setPersistedStageViewHeight,
    defaultStageViewHeight,
    treeViewWidth,
    stageViewWidth,
    stageViewHeight,
  } = useLayoutPreferences();

  const { direction = "horizontal", storageKey } = props;
  const [isDragging, setIsDragging] = useState(false);

  const panelSize = (() => {
    if (storageKey === "stages") return treeViewWidth;
    if (storageKey === "graph") {
      if (direction === "vertical") {
        return stageViewHeight;
      } else {
        return stageViewWidth;
      }
    }
    return 300; // fallback
  })();

  const dividerRef = useRef<HTMLDivElement>(null);

  const startDragging = (e: ReactMouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const stopDragging = () => setIsDragging(false);

  const handleDragging = (e: MouseEvent) => {
    if (!isDragging) return;

    // Dynamically follow mouse based on direction
    const newSize =
      direction === "vertical"
        ? e.clientY - getContainerOffset()
        : e.clientX - getContainerOffset();

    const maxZoom = 3;
    const clampedSize = Math.max(
      direction === "vertical"
        ? Math.min(defaultStageViewHeight, defaultLayout.nodeSpacingH)
        : 200,
      Math.min(
        newSize,
        storageKey === "graph" && direction === "vertical"
          ? defaultStageViewHeight * maxZoom
          : 1500,
      ),
    );

    // Update context sizes
    if (storageKey === "stages") {
      setTreeViewWidth(clampedSize);
    } else if (storageKey === "graph") {
      if (direction === "vertical") {
        setPersistedStageViewHeight(clampedSize);
      } else {
        setStageViewWidth(clampedSize);
      }
    }
  };

  const handleDoubleClick = () => {
    if (storageKey === "stages") {
      setTreeViewWidth(300);
    } else if (storageKey === "graph") {
      if (direction === "vertical") {
        setPersistedStageViewHeight(0);
      } else {
        setStageViewWidth(600);
      }
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const getContainerOffset = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return direction === "vertical" ? rect.top : rect.left;
    }
    return 0;
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
  const hasSidePanel = childrenArray.length > 1;
  const mainPanel = hasSidePanel ? childrenArray[1] : childrenArray[0];

  const gridTemplate = `${panelSize}px 1fr`;

  // The main panel stays in the same place in the tree whether or not the side
  // panel is shown, so hiding or showing the side panel doesn't remount it and
  // lose its state, such as expanded console sections and keyboard focus.
  return (
    <div
      ref={containerRef}
      className="pgv-split-view__container"
      style={
        hasSidePanel
          ? {
              gridTemplateColumns:
                direction === "vertical" ? undefined : gridTemplate,
              gridTemplateRows:
                direction === "vertical" ? gridTemplate : undefined,
            }
          : { display: "block" }
      }
    >
      {hasSidePanel && (
        <div
          className={classNames("pgv-split-view__side-panel", {
            "pgv-split-view__side-panel--vertical": direction === "vertical",
          })}
        >
          {childrenArray[0]}
          <div
            ref={dividerRef}
            onMouseDown={startDragging}
            onDoubleClick={handleDoubleClick}
            className={`pgv-split-view__divider ${
              direction === "vertical"
                ? "pgv-split-view__divider--vertical"
                : ""
            }`}
          />
        </div>
      )}
      <div>{mainPanel}</div>
    </div>
  );
}

interface SplitViewNewProps {
  children: ReactNode[];
  direction?: "horizontal" | "vertical";
  storageKey: "stages" | "graph";
}
