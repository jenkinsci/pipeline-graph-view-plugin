import React from "react";
import { StepInfo, StepLogBufferInfo } from "../../../common/RestClient";
import ConsoleLogCard from "./ConsoleLogCard";
import { LOG_FETCH_SIZE, StageInfo } from "./PipelineConsoleModel";
import "./stage-steps.scss";

export default function StageSteps({
  stage,
  stepBuffers,
  steps,
  handleStepToggle,
  expandedSteps,
  handleMoreConsoleClick,
  scrollParentId,
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
            handleStepToggle={handleStepToggle}
            isExpanded={expandedSteps.includes(stepItemData.id)}
            handleMoreConsoleClick={handleMoreConsoleClick}
            key={`step-console-card-${stepItemData.id}`}
            scrollParentId={scrollParentId}
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
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  // Id of the element whose scroll bar we wish to use.
  scrollParentId: string;
}
