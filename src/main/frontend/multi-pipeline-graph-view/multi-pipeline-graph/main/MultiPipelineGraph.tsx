import React, { useEffect, useState } from "react";
import { RunInfo } from "./MultiPipelineGraphModel";
import startPollingRunsStatus from "./support/startPollingRunsStatus";
import { SingleRun } from "./SingleRun";
import { UserPreferences } from "../../../pipeline-graph-view/pipeline-graph/main";
import { getUserPreferences } from "../../../common/RestClient";

export const MultiPipelineGraph = () => {
  const [runs, setRuns] = useState<Array<RunInfo>>([]);
  const [poll, setPoll] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ timezone: 'UTC' });

  useEffect(() => {
    if (!poll) {
      setPoll(true);
      startPollingRunsStatus(setRuns, (err) => {
        console.log(err);
      });
    }
  }, [runs, poll]);

  useEffect(() => {
    const fetchPreferences = async () => {
      const preferences = await getUserPreferences();
      setUserPreferences(preferences);
    };

    fetchPreferences();
  }, []);

  return (
    <table className="jenkins-table sortable">
      <thead>
        <tr>
          <th className="jenkins-table__cell--tight">ID</th>
          <th data-sort-disable="true">Pipeline</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <SingleRun key={run.id} run={run} userPreferences={userPreferences}/>
        ))}
      </tbody>
    </table>
  );
};
