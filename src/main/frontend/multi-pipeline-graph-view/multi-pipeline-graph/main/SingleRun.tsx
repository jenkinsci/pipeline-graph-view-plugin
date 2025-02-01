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
  let path = `tree?runId=${run.id}`;

  const url = new URL(window.location.href);

  const onJobView = !url.pathname.endsWith("multi-pipeline-graph/");
  if (onJobView) {
    path = `multi-pipeline-graph/${path}`;
  }

  let singleRunPage = `../${run.id}/pipeline-graph/`;
  if (onJobView) {
    singleRunPage = `${run.id}/pipeline-graph/`;
  }

  const handleNodeClick = (nodeName: string, id: number) => {
    console.log(nodeName, id);
    let redirect = `../${run.id}/pipeline-console?selected-node=${id}`;
    if (onJobView) {
      redirect = `${run.id}/pipeline-console?selected-node=${id}`;
    }
    window.location.href = redirect;
  };
  return (
    <tr>
      <td>
        <a
          href={singleRunPage}
          className="jenkins-table__link pgw-user-specified-text"
        >
          {run.displayName}
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
