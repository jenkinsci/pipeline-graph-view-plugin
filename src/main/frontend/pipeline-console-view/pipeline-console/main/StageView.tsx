import "./stage-view.scss";

import {
  StageInfo,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel.tsx";
import StageDetails from "./stage-details.tsx";
import StageSteps from "./stage-steps.tsx";
import StagesToggle from "./stages-toggle.tsx";

export default function StageView(props: StageViewProps) {
  return (
    <>
      <div className="pgv-stage-view__header">
        {props.canToggleStages && <StagesToggle />}
        <StageDetails
          stage={props.stage}
          steps={props.steps}
          expandedSteps={props.expandedSteps}
          expandAllForStage={props.expandAllForStage}
          collapseAllForStage={props.collapseAllForStage}
        />
      </div>
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
  canToggleStages?: boolean;
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
