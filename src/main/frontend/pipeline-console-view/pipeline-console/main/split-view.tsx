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
    treeViewWidth,
    stageViewWidth,
    stageViewHeight,
  } = useLayoutPreferences();

  const { direction = "horizontal", storageKey } = props;
  const [isDragging, setIsDragging] = useState(false);

  const isVertical = direction === "vertical";

  const initialSize = (() => {
    if (storageKey === "stages") return treeViewWidth;
    if (storageKey === "graph") {
      return isVertical ? stageViewHeight : stageViewWidth;
    }
    return 300; // fallback
  })();

  useEffect(() => {
    const newSize = (() => {
      if (storageKey === "stages") return treeViewWidth;
      if (storageKey === "graph") {
        return direction === "vertical" ? stageViewHeight : stageViewWidth;
      }
      return 300;
    })();

    setPanelSize(newSize);
  }, [direction, treeViewWidth, stageViewWidth, stageViewHeight, storageKey]);

  const [panelSize, setPanelSize] = useState<number>(initialSize);

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

    const clampedSize = Math.max(
      direction === "vertical" ? 100 : 200,
      Math.min(newSize, 1500),
    );
    setPanelSize(clampedSize);

    // Update context sizes
    if (storageKey === "stages") {
      setTreeViewWidth(clampedSize);
    } else if (storageKey === "graph") {
      if (direction === "vertical") {
        setStageViewHeight(clampedSize);
      } else {
        setStageViewWidth(clampedSize);
      }
    }
  };

  const handleDoubleClick = () => {
    const resetSize = (() => {
      if (storageKey === "stages") return 300;
      if (storageKey === "graph") return isVertical ? 250 : 600;
      return 300;
    })();

    setPanelSize(resetSize);

    if (storageKey === "stages") {
      setTreeViewWidth(resetSize);
    } else if (storageKey === "graph") {
      if (direction === "vertical") {
        setStageViewHeight(resetSize);
      } else {
        setStageViewWidth(resetSize);
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

  // If we only have one child, just return it
  const childrenArray = Children.toArray(props.children).filter(Boolean);
  if (childrenArray.length === 1) {
    return <>{childrenArray[0]}</>;
  }

  const gridTemplate =
    direction === "vertical" ? `${panelSize}px 1fr` : `${panelSize}px 1fr`;

  return (
    <div
      ref={containerRef}
      className="pgv-split-view__container"
      style={{
        display: "grid",
        gridTemplateColumns:
          direction === "vertical" ? undefined : gridTemplate,
        gridTemplateRows: direction === "vertical" ? gridTemplate : undefined,
      }}
    >
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
            direction === "vertical" ? "pgv-split-view__divider--vertical" : ""
          }`}
        />
      </div>
      <div>{childrenArray[1]}</div>
    </div>
  );
}

interface SplitViewNewProps {
  children: ReactNode[];
  direction?: "horizontal" | "vertical";
  storageKey: "stages" | "graph";
}
