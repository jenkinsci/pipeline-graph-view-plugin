import { lazy, useEffect, useState } from "react";

import {
  getEarlyConsoleText,
  StepLogBufferInfo,
} from "../../../common/RestClient.tsx";
import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream.tsx"));

async function fetchData(url: string): Promise<StepLogBufferInfo> {
  const consoleBuildOutput = await getEarlyConsoleText(url);

  return {
    lines: consoleBuildOutput?.trimEnd()?.split("\n") ?? [],
    startByte: 0,
    endByte: 0,
  };
}

interface EarlyConsoleTextProps {
  currentRunPath: string;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
}

export function EarlyConsoleText(props: EarlyConsoleTextProps) {
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
          stepId={"-1"}
          stepState={Result.success}
          fetchExceptionText={async () => logBuffer}
          currentRunPath={props.currentRunPath}
        />
      </div>
    </div>
  );
}
