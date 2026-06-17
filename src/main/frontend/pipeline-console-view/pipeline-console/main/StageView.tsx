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
      <StageDetails
        stage={props.stage}
        steps={props.steps}
        expandedSteps={props.expandedSteps}
        expandAllForStage={props.expandAllForStage}
        collapseAllForStage={props.collapseAllForStage}
      />
      <StageSteps
        stage={props.stage}
        steps={props.steps}
        stepBuffers={props.stepBuffers}
        expandedSteps={props.expandedSteps}
        onStepToggle={props.onStepToggle}
        tailLogs={props.tailLogs}
        scrollToTail={props.scrollToTail}
        stopTailingLogs={props.stopTailingLogs}
        fetchLogText={props.fetchLogText}
        fetchExceptionText={props.fetchExceptionText}
        currentRunPath={props.currentRunPath}
      />
    </>
  );
}

export interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  expandedSteps: string[];
  expandAllForStage: (steps: StepInfo[]) => void;
  collapseAllForStage: (steps: StepInfo[]) => void;
  onStepToggle: (nodeId: string) => void;
  fetchLogText: (
    stepId: string,
    startByte: number,
  ) => Promise<StepLogBufferInfo>;
  fetchExceptionText: (stepId: string) => Promise<StepLogBufferInfo>;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
  stopTailingLogs: () => void;
  currentRunPath: string;
}
