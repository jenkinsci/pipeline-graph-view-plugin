import { lazy, useEffect, useState } from "react";

import {
  getConsoleBuildOutput,
  StepInfo,
  StepLogBufferInfo,
} from "../../../common/RestClient.tsx";
import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream.tsx"));

async function fetchData(): Promise<StepLogBufferInfo> {
  const consoleBuildOutput = await getConsoleBuildOutput();

  return {
    lines: consoleBuildOutput?.split("\n") ?? [],
    startByte: 0,
    endByte: 0,
  };
}

export function NoStageStepsFallback() {
  const step: StepInfo = {
    id: "step-1",
    name: "Step 1",
    title: "Step 1 Title",
    state: Result.success,
    completePercent: 100,
    type: "STEP",
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "",
    pauseDurationMillis: 0,
  };

  const [logBuffer, setLogBuffer] = useState<StepLogBufferInfo>();

  useEffect(() => {
    fetchData()
      .then((data) => {
        setLogBuffer(data);
        return data;
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className={"pgv-stage-steps"}>
      <div className={"pgv-step-detail-group"}>
        <ConsoleLogStream
          logBuffer={logBuffer ?? { lines: [], startByte: 0, endByte: 0 }}
          onMoreConsoleClick={() => {}}
          step={step}
          maxHeightScale={0.65}
          fetchExceptionText={() => {}}
        />
      </div>
    </div>
  );
}
