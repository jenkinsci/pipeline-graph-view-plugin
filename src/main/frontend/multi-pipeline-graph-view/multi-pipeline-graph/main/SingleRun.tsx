import React, { useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel.js";
import {
  LayoutInfo,
  PipelineGraph,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/index.js";
import { defaultLayout } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.js";
import { time, Total } from "../../../common/utils/timings.js";
import "./single-run.scss";
import StatusIcon from "../../../common/components/status-icon.js";

export default function SingleRun({ run, currentJobPath }: SingleRunProps) {
  const [stages, setStages] = useState<Array<StageInfo>>([]);

  const layout: LayoutInfo = {
    ...defaultLayout,
    nodeSpacingH: 45,
  };

  return (
    <div className="pgv-single-run">
      <div>
        <a href={currentJobPath + run.id} className="pgw-user-specified-text">
          <StatusIcon status={run.result} />
          {run.displayName}
          <span>
            {time(run.timestamp)} - <Total ms={run.duration} />
          </span>
        </a>
      </div>
      <PipelineGraph
        stages={stages}
        setStages={setStages}
        currentRunPath={currentJobPath + run.id + "/"}
        layout={layout}
        collapsed={true}
      />
    </div>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
}
