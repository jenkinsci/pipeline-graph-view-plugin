import React, { useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel";
import {
  PipelineGraph,
  PipelineSummary,
  StageInfo,
  UserPreferences
} from "../../../pipeline-graph-view/pipeline-graph/main";

interface Props {
  run: RunInfo;
  userPreferences: UserPreferences;
}

export const SingleRun: (data: Props) => JSX.Element = ({ run, userPreferences }) => {
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

  const handleChipClick = () => {
    window.location.href = singleRunPage;
  };

  const jobStatus = `${run.result.toLowerCase()}`;
  
  return (
    <tr>
      <td>
          <PipelineSummary
            label={run.displayName}
            status={jobStatus}
            onClick={handleChipClick}
            startTime={run.startTime}
            duration={run.duration}
            timezone={userPreferences.timezone}
          />
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
