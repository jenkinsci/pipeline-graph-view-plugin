import React from "react";
import { RunInfo } from "./MultiPipelineGraphModel.ts";
import { time, Total } from "../../../common/utils/timings.tsx";
import "./single-run.scss";
import StatusIcon from "../../../common/components/status-icon.tsx";
import {
  LayoutInfo,
  PipelineGraph,
} from "../../../pipeline-graph-view/pipeline-graph/main";
import { defaultLayout } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import useRunPoller from "../../../common/tree-api.ts";

export default function SingleRun({ run, currentJobPath }: SingleRunProps) {
  const { run: runInfo } = useRunPoller({
    currentRunPath: currentJobPath + run.id + "/",
  });

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
        stages={runInfo?.stages || []}
        layout={layout}
        collapsed
        onStageSelect={() => {}}
      />
    </div>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
}
