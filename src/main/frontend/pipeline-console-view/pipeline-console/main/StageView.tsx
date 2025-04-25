import React from "react";

import { StepInfo, StageInfo, StepLogBufferInfo } from "./PipelineConsoleModel.js";
import StageDetails from "./stage-details.js";
import StageSteps from "./stage-steps.js";

export default function StageView(props: StageViewProps) {
  return (
    <>
      <StageDetails stage={props.stage} />
      <StageSteps
        stage={props.stage}
        steps={props.steps}
        stepBuffers={props.stepBuffers}
        expandedSteps={props.expandedSteps}
        handleStepToggle={props.handleStepToggle}
        handleMoreConsoleClick={props.handleMoreConsoleClick}
      />
    </>
  );
}

export interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  expandedSteps: string[];
  handleStepToggle: (nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
}
