import { useContext, useEffect, useState } from "react";

import {
  I18NContext,
  LocaleContext,
  LocalizedMessageKey,
} from "../../../common/i18n/index.ts";
import { RunInfo } from "./MultiPipelineGraphModel.ts";
import SingleRun from "./SingleRun.tsx";
import startPollingRunsStatus from "./support/startPollingRunsStatus.ts";

export const MultiPipelineGraph = () => {
  const [runs, setRuns] = useState<Array<RunInfo>>([]);
  const [poll, setPoll] = useState(false);

  const rootElement = document.getElementById("multiple-pipeline-root");
  const currentJobPath = rootElement!.dataset.currentJobPath!;

  useEffect(() => {
    if (!poll) {
      setPoll(true);
      startPollingRunsStatus(currentJobPath, setRuns, (err) => {
        console.log(err);
      });
    }
  }, [runs, poll]);

  const locale = useContext(LocaleContext);

  const groupedRuns: Record<string, RunInfo[]> = runs.reduce(
    (acc: Record<string, RunInfo[]>, run) => {
      const date = new Date(run.timestamp).toLocaleDateString(locale, {
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

  const messages = useContext(I18NContext);

  return (
    <>
      {Object.keys(groupedRuns).length === 0 ? (
        <div className="pgv-stages__group">
          <div className="pgv-stages__heading">
            {messages.format(LocalizedMessageKey.noBuilds)}
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
