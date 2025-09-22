import "./stage-steps.scss";

import { StepInfo, StepLogBufferInfo } from "../../../common/RestClient.tsx";
import ConsoleLogCard from "./ConsoleLogCard.tsx";
import { StageInfo, TAIL_CONSOLE_LOG } from "./PipelineConsoleModel.tsx";

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
              stepBuffers.get(stepItemData.id) ?? {
                lines: [],
                startByte: 0,
                endByte: TAIL_CONSOLE_LOG,
              }
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
