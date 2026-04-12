import { lazy, useEffect, useState } from "react";

import {
  getConsoleBuildOutput,
  StepLogBufferInfo,
} from "../../../common/RestClient.tsx";
import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream.tsx"));

async function fetchData(url: string): Promise<StepLogBufferInfo> {
  const consoleBuildOutput = await getConsoleBuildOutput(url);

  return {
    lines: consoleBuildOutput?.split("\n") ?? [],
    startByte: 0,
    endByte: 0,
  };
}

interface NoStageStepsFallbackProps {
  currentRunPath: string;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
}

export function NoStageStepsFallback(props: NoStageStepsFallbackProps) {
  const [logBuffer, setLogBuffer] = useState<StepLogBufferInfo>({
    lines: [],
    startByte: 0,
    endByte: 0,
  });

  useEffect(() => {
    fetchData(props.currentRunPath)
      .then((data) => {
        setLogBuffer(data);
        return data;
      })
      .catch((err) => console.log(err));
  }, [props.currentRunPath]);

  return (
    <div className={"pgv-stage-steps"}>
      <div className={"pgv-step-detail-group"}>
        <ConsoleLogStream
          {...props}
          logBuffer={logBuffer}
          updateLogBufferIfChanged={() => {}}
          fetchLogText={async () => logBuffer}
          stopTailingLogs={() => {}}
          stepId={""}
          stepState={Result.success}
          fetchExceptionText={async () => logBuffer}
          currentRunPath={props.currentRunPath}
        />
      </div>
    </div>
  );
}
