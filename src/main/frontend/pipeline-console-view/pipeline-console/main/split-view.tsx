import React, { useState, useRef, useEffect } from "react";
import "./split-view.scss";
import { useLayoutPreferences } from "./providers/user-preference-provider";

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
    if (storageKey === "tree") return treeViewWidth;
    if (storageKey === "stage")
      return isVertical ? stageViewHeight : stageViewWidth;
    return 300; // fallback
  })();

  const [panelSize, setPanelSize] = useState<number>(initialSize);

  const dividerRef = useRef<HTMLDivElement>(null);

  const startDragging = (e: React.MouseEvent) => {
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
    ); // clamp between 100px and 1000px
    setPanelSize(clampedSize);

    // Update context sizes
    if (storageKey === "tree") {
      setTreeViewWidth(clampedSize);
    } else if (storageKey === "stage") {
      if (direction === "vertical") {
        setStageViewHeight(clampedSize);
      } else {
        setStageViewWidth(clampedSize);
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
  const childrenArray = React.Children.toArray(props.children).filter(Boolean);
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
      <div className="pgv-split-view__side-panel">
        {childrenArray[0]}
        <div
          ref={dividerRef}
          onMouseDown={startDragging}
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
  children: React.ReactNode[];
  direction?: "horizontal" | "vertical";
  storageKey: "tree" | "stage";
}
