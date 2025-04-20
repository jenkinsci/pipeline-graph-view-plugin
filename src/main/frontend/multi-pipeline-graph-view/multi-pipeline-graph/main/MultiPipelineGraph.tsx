import React, { useEffect, useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel";
import startPollingRunsStatus from "./support/startPollingRunsStatus";
import SingleRun from "./SingleRun";

export const MultiPipelineGraph = () => {
  const [runs, setRuns] = useState<Array<RunInfo>>([]);
  const [poll, setPoll] = useState(false);

  const rootElement = document.getElementById("multiple-pipeline-root");
  const currentJobPath = rootElement?.dataset.currentJobPath!;

  useEffect(() => {
    if (!poll) {
      setPoll(true);
      startPollingRunsStatus(currentJobPath, setRuns, (err) => {
        console.log(err);
      });
    }
  }, [runs, poll]);
  return (
    <>
      {runs.length > 0 && (
        <table className="jenkins-table sortable">
          <thead>
            <tr></tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <SingleRun
                key={run.id}
                run={run}
                currentJobPath={currentJobPath}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};
