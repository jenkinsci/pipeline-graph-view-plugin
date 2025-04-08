import React, { useState, useRef, useEffect } from "react";
import "./split-view-new.scss";

export default function SplitViewNew(props: SplitViewNewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);
  const dividerRef = useRef<HTMLDivElement>(null);

  const startDragging = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const stopDragging = () => setIsDragging(false);

  const handleDragging = (e: MouseEvent) => {
    if (isDragging) {
      const newWidth = e.clientX - 24; // Update to be section padding
      setPanelWidth(Math.max(200, Math.min(newWidth, 500)));
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleDragging);
    window.addEventListener("mouseup", stopDragging);
    return () => {
      window.removeEventListener("mousemove", handleDragging);
      window.removeEventListener("mouseup", stopDragging);
    };
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${panelWidth}px 1fr`,
        gap: "var(--section-padding)",
        position: "relative",
      }}
    >
      <div className="pgv-split-view-new">
        {props.children[0]}

        <div
          ref={dividerRef}
          onMouseDown={startDragging}
          className="pgv-split-view__divider"
        />
      </div>

      <div>{props.children[1]}</div>
    </div>
  );
}

interface SplitViewNewProps {
  children: React.ReactNode[];
}