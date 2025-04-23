import React, { useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel";
import {
  PipelineGraph,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main";

export default function SingleRun({ run, currentJobPath }: SingleRunProps) {
  const [stages, setStages] = useState<Array<StageInfo>>([]);

  return (
    <tr>
      <td>
        <a
          href={currentJobPath + run.id}
          className="jenkins-table__link pgw-user-specified-text"
        >
          {run.displayName}
        </a>
      </td>
      <td>
        <PipelineGraph
          stages={stages}
          setStages={setStages}
          currentRunPath={currentJobPath + run.id + "/"}
          collapsed={true}
        />
      </td>
    </tr>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
}
