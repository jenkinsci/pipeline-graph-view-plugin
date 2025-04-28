import React, { useContext, useEffect, useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel.ts";
import startPollingRunsStatus from "./support/startPollingRunsStatus.ts";
import SingleRun from "./SingleRun.tsx";
import { I18NContext } from "../../../common/i18n/i18n-provider.tsx";

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

  const translations = useContext(I18NContext);

  return (
    <>
      {Object.keys(groupedRuns).length === 0 ? (
        <div className="pgv-stages__group">
          <div className="pgv-stages__heading">
            {translations.get("noBuilds")()}
          </div>
        </div>
      ) : (
        Object.entries(groupedRuns).map(([date, runsOnDate]) => (
          <div className={"pgv-stages__group"} key={date}>
            <p className="pgv-stages__heading">{date}</p>
            {runsOnDate.map((run) => (
              <SingleRun
                key={run.id}
                run={run}
                currentJobPath={currentJobPath}
              />
            ))}
          </div>
        ))
      )}
    </>
  );
};
