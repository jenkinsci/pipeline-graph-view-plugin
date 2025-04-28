import React, { useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel.ts";
import {
  LayoutInfo,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/index.ts";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraph.tsx";
import { defaultLayout } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { time, Total } from "../../../common/utils/timings.tsx";
import "./single-run.scss";
import StatusIcon from "../../../common/components/status-icon.tsx";

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
      {/*<PipelineGraph*/}
      {/*  stages={stages}*/}
      {/*  setStages={setStages}*/}
      {/*  currentRunPath={currentJobPath + run.id + "/"}*/}
      {/*  layout={layout}*/}
      {/*  collapsed={true}*/}
      {/*/>*/}
    </div>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
}
