import { classNames } from "../../../../common/utils/classnames.ts";
import { StageViewPosition } from "../providers/user-preference-provider.tsx";
import {
  PipelineGraph,
  StageInfo,
} from "../../../../pipeline-graph-view/pipeline-graph/main/index.ts";
import React, { CSSProperties, useEffect, useState } from "react";
import "./stages.scss";

export default function Stages({
  stages,
  stageViewPosition,
  handleStageSelect,
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
        "pgv-graph-view-thing--left": stageViewPosition === StageViewPosition.LEFT,
      })}
      style={{ '--additional-height': sidebarHeight + "px" } as CSSProperties}
    >
      <div className={"test-floaty-material pgv-graph-view-thing__heading"}>Stages</div>
      <PipelineGraph stages={stages} onStageSelect={handleStageSelect} />
    </div>
  );
}

interface StagesProps {
  stages: StageInfo[];
  stageViewPosition: StageViewPosition;
  handleStageSelect: (nodeId: string) => void;
}
