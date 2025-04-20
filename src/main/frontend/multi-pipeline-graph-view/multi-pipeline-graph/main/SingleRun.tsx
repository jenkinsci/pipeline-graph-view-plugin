import React, { useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel";
import {
  LayoutInfo,
  PipelineGraph,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main";
import { defaultLayout } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
import { total } from "../../../common/utils/timings";

export default function SingleRun({ run, currentJobPath }: SingleRunProps) {
  const [stages, setStages] = useState<Array<StageInfo>>([]);

  const layout: LayoutInfo = {
    ...defaultLayout,
    nodeSpacingH: 45,
  };

  return (
    <tr>
      <td>
        <div>
          <a
            // style={{textOverflow: "ellipsis"}}
            href={currentJobPath + run.id}
            className="jenkins-table__link pgw-user-specified-text"
          >
            {run.displayName}
          </a>
        </div>
      </td>
      <td>
        <PipelineGraph
          stages={stages}
          setStages={setStages}
          currentRunPath={currentJobPath + run.id}
          layout={layout}
          collapsed={true}
        />
      </td>
      <td>
        <div>
          <span>{new Date(run.timestamp).toLocaleDateString()}</span>
        </div>
        <div>
          <span className={"jenkins-subtitle"}>{total(run.duration)}</span>
        </div>
      </td>
    </tr>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
}
