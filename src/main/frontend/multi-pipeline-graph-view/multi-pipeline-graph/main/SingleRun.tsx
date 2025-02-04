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
          path={path}
          collapsed={true}
        />
      </td>
    </tr>
  );
};
