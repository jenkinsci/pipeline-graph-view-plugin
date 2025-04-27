import React, { useEffect, useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel.ts";
import startPollingRunsStatus from "./support/startPollingRunsStatus.ts";
import SingleRun from "./SingleRun.tsx";

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

  const groupedRuns: Record<string, RunInfo[]> = runs.reduce(
    (acc: Record<string, RunInfo[]>, run) => {
      const date = new Date(run.timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(run);

      return acc;
    },
    {},
  );

  return (
    <>
      {Object.entries(groupedRuns).map(([date, runsOnDate]) => (
        <div className={"pgv-stages__group"} key={date}>
          <p className="pgv-stages__heading">{date}</p>
          {runsOnDate.map((run) => (
            <SingleRun key={run.id} run={run} currentJobPath={currentJobPath} />
          ))}
        </div>
      ))}
    </>
  );
};
