import { classNames } from "../../../../common/utils/classnames.ts";
import { StageViewPosition } from "../providers/user-preference-provider.tsx";
import {
  PipelineGraph,
  StageInfo,
} from "../../../../pipeline-graph-view/pipeline-graph/main/index.ts";
import React, { CSSProperties, useEffect, useState } from "react";
import "./stages.scss";
import Tooltip from "../../../../common/components/tooltip.tsx";

export default function Stages({
  stages,
  stageViewPosition,
  onStageSelect,
}: StagesProps) {
  const [sidebarHeight, setSidebarHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setSidebarHeight(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);

    // Set initial height
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={classNames("pgv-graph-view-thing", {
        "pgv-graph-view-thing--left":
          stageViewPosition === StageViewPosition.LEFT,
      })}
      style={{ "--additional-height": sidebarHeight + "px" } as CSSProperties}
    >
      <div className={"test-floaty-material pgv-graph-view-thing__heading"}>
        Graph
      </div>
      <div className={"test-floaty-material pgw-fullscreen-controls"}>
        <Tooltip content={"Expand"}>
          <button
            className={"jenkins-button jenkins-button--tertiary"}
            onClick={() => alert("This will expand")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4H15C15.5523 4 16 4.44772 16 5V10M10 16H5C4.44772 16 4 15.5523 4 15V10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
      <PipelineGraph stages={stages} onStageSelect={onStageSelect} />
    </div>
  );
}

interface StagesProps {
  stages: StageInfo[];
  stageViewPosition: StageViewPosition;
  onStageSelect: (nodeId: string) => void;
}
