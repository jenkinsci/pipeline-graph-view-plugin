import React from "react";

import {
  StepInfo,
  StageInfo,
  StepLogBufferInfo,
  LOG_FETCH_SIZE,
} from "./PipelineConsoleModel";
import ConsoleLogCard from "./ConsoleLogCard";
import StageDetails from "./StageDetails";

export default function StageView(props: StageViewProps) {
  const getTreeItemsFromStepList = (stepsItems: StepInfo[]) => {
    return stepsItems.map((stepItemData) => {
      return (
        <ConsoleLogCard
          step={stepItemData}
          stepBuffer={
            props.stepBuffers.get(stepItemData.id) ??
            ({
              lines: [] as string[],
              startByte: 0 - LOG_FETCH_SIZE,
              endByte: -1,
            } as StepLogBufferInfo)
          }
          handleStepToggle={props.handleStepToggle}
          isExpanded={props.expandedSteps.includes(stepItemData.id)}
          handleMoreConsoleClick={props.handleMoreConsoleClick}
          key={`step-console-card-${stepItemData.id}`}
          scrollParentId={props.scrollParentId}
        />
      );
    });
  };

  return (
    <>
      <StageDetails stage={props.stage} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
          border: "var(--jenkins-border)",
          background: "var(--card-background)",
          borderRadius: "var(--form-input-border-radius)",
          padding: "0.375rem",
        }}
        key={`stage-steps-container-${props.stage ? props.stage.id : "unk"}`}
      >
        {getTreeItemsFromStepList(props.steps)}
      </div>
    </>
  );
}

export interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  selectedStage: string;
  expandedSteps: string[];
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  // Id of the element whose scroll bar we wish to use.
  scrollParentId: string;
}
