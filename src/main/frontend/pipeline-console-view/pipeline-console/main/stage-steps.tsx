import "./stage-steps.scss";

import { StepInfo, StepLogBufferInfo } from "../../../common/RestClient.tsx";
import ConsoleLogCard from "./ConsoleLogCard.tsx";
import { LOG_FETCH_SIZE, StageInfo } from "./PipelineConsoleModel.tsx";

export default function StageSteps({
  stage,
  stepBuffers,
  steps,
  onStepToggle,
  expandedSteps,
  onMoreConsoleClick,
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
            step={stepItemData}
            stepBuffer={
              stepBuffers.get(stepItemData.id) ??
              ({
                lines: [] as string[],
                startByte: 0 - LOG_FETCH_SIZE,
                endByte: -1,
              } as StepLogBufferInfo)
            }
            onStepToggle={onStepToggle}
            isExpanded={expandedSteps.includes(stepItemData.id)}
            onMoreConsoleClick={onMoreConsoleClick}
            fetchExceptionText={fetchExceptionText}
            key={`step-console-card-${stepItemData.id}`}
          />
        );
      })}
    </div>
  );
}

interface StageStepsProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  expandedSteps: string[];
  onStepToggle: (nodeId: string) => void;
  onMoreConsoleClick: (nodeId: string, startByte: number) => void;
  fetchExceptionText: (nodeId: string) => void;
}
