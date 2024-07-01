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

  const onJobView = !window.location.href.endsWith("multi-pipeline-graph/");
  if (onJobView) {
    path = `multi-pipeline-graph/${path}`;
  }

  let singleRunPage = `../${run.id}/pipeline-graph/`;
  if (onJobView) {
    singleRunPage = `${run.id}/pipeline-graph/`;
  }

  const handleNodeClick = (nodeName: string, id: number) => {
    let redirect = `../${run.id}/pipeline-console?selected-node=${id}`;
    if (onJobView) {
      redirect = `${run.id}/pipeline-console?selected-node=${id}`;
    }
    window.location.href = redirect;
  };

  const jobStatus = `${run.result.toLowerCase()}`;

  return (
    <tr>
      <td>
        <div className="PWGx-PipelineGraph-Summary-container">
          <a href={singleRunPage} className={`PWGx-Link  ${jobStatus}`}>
            <p>{run.displayName}</p>
          </a>
          <div className="PWGx-Start">
            <span>{run.startTime} - {jobStatus === "in_progress" ? "Running..." : run.duration}</span>
          </div>
        </div>
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
