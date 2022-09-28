import React, { useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel";
import {
  PipelineGraph,
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main";

interface Props {
  run: RunInfo;
}

export const SingleRun: (data: Props) => JSX.Element = ({ run }) => {
  const [stages, setStages] = useState<Array<StageInfo>>([]);
  const path = `graph?runId=${run.id}`;
  const singleRunPage = `../${run.id}/pipeline-graph/`;

  const handleNodeClick = (nodeName: string, id: number) => {
    console.log(nodeName, id);
    window.location.href = `../${run.id}/pipeline-console?selected-node=${id}`;
  };
  return (
    <tr>
      <td>
        <a href={singleRunPage} className="jenkins-table__link">
          {run.id}
        </a>
      </td>
      <td>
        <PipelineGraph
          stages={stages}
          setStages={setStages}
          onNodeClick={handleNodeClick}
          path={path}
          collapsed={true}
        />
      </td>
    </tr>
  );
};
