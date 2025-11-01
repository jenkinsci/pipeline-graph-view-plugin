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

interface NoStageStepsFallbackProps {
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
}

export function NoStageStepsFallback(props: NoStageStepsFallbackProps) {
  const step: StepInfo = {
    id: "",
    name: "Step 1",
    title: "Step 1 Title",
    state: Result.success,
    type: "STEP",
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "",
    pauseDurationMillis: 0,
  };

  const [logBuffer, setLogBuffer] = useState<StepLogBufferInfo>({
    lines: [],
    startByte: 0,
    endByte: 0,
  });

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
          {...props}
          logBuffer={logBuffer}
          setLogBuffer={setLogBuffer}
          fetchLogText={async () => logBuffer}
          stopTailingLogs={() => {}}
          step={step}
          fetchExceptionText={async () => logBuffer}
        />
      </div>
    </div>
  );
}
