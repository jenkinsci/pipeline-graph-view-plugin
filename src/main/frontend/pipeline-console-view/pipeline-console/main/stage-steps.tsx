import "./stage-steps.scss";

import { StepInfo, StepLogBufferInfo } from "../../../common/RestClient.tsx";
import ConsoleLogCard from "./ConsoleLogCard.tsx";
import { StageInfo } from "./PipelineConsoleModel.tsx";
import { useFilter } from "./providers/filter-provider.tsx";

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
  const { showHiddenSteps } = useFilter();

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className={"pgv-stage-steps"}
      key={`stage-steps-container-${stage ? stage.id : "unk"}`}
    >
      {steps
        .filter((step) => showHiddenSteps || !step.flags?.hidden)
        .map((stepItemData) => {
          return (
            <ConsoleLogCard
              tailLogs={tailLogs}
              scrollToTail={scrollToTail}
              stopTailingLogs={stopTailingLogs}
              step={stepItemData}
              stepBuffers={stepBuffers}
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
  fetchLogText: (
    stepId: string,
    startByte: number,
  ) => Promise<StepLogBufferInfo>;
  fetchExceptionText: (stepId: string) => Promise<StepLogBufferInfo>;
  tailLogs: boolean;
  scrollToTail: (stepId: string, element: HTMLDivElement) => void;
  stopTailingLogs: () => void;
}
