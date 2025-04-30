import {
  StageInfo,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";
import StageDetails from "./stage-details.tsx";
import StageSteps from "./stage-steps.tsx";

export default function StageView(props: StageViewProps) {
  return (
    <>
      <StageDetails stage={props.stage} />
      <StageSteps
        stage={props.stage}
        steps={props.steps}
        stepBuffers={props.stepBuffers}
        expandedSteps={props.expandedSteps}
        onStepToggle={props.onStepToggle}
        onMoreConsoleClick={props.onMoreConsoleClick}
      />
    </>
  );
}

export interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  expandedSteps: string[];
  onStepToggle: (nodeId: string) => void;
  onMoreConsoleClick: (nodeId: string, startByte: number) => void;
}
