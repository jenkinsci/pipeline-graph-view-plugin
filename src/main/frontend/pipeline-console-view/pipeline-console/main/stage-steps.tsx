import "./stage-steps.scss";

import { StepInfo, StepLogBufferInfo } from "../../../common/RestClient.tsx";
import ConsoleLogCard from "./ConsoleLogCard.tsx";
import { StageInfo, TAIL_CONSOLE_LOG } from "./PipelineConsoleModel.tsx";

export default function StageSteps({
  tailLogs,
  scrollToTail,
  stopTailingLogs,
  stage,
  stepBuffers,
  steps,
  onStepToggle,
  expandedSteps,
  fetchLogText,
  fetchExceptionText,
}: StageStepsProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className={"pgv-stage-steps"}
      key={`stage-steps-container-${stage ? stage.id : "unk"}`}
    >
      {steps.map((stepItemData) => {
        return (
          <ConsoleLogCard
            tailLogs={tailLogs}
            scrollToTail={scrollToTail}
            stopTailingLogs={stopTailingLogs}
            step={stepItemData}
            stepBuffer={
              stepBuffers.get(stepItemData.id) ?? {
                lines: [],
                startByte: 0,
                endByte: TAIL_CONSOLE_LOG,
              }
            }
            onStepToggle={onStepToggle}
            isExpanded={expandedSteps.includes(stepItemData.id)}
            fetchLogText={fetchLogText}
            fetchExceptionText={fetchExceptionText}
            key={`step-console-card-${stepItemData.id}`}
          />
        );
      })}
    </div>
  );
}

export interface StageStepsProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  expandedSteps: string[];
  onStepToggle: (nodeId: string) => void;
  fetchLogText: (nodeId: string, startByte: number) => void;
  fetchExceptionText: (nodeId: string) => void;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
  stopTailingLogs: () => void;
}
