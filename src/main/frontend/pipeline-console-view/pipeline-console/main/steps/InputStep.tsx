import InputApprovers from "../../../../common/components/input-approvers.tsx";
import InputStepControls from "../../../../common/components/input-step-controls.tsx";
import StatusIcon from "../../../../common/components/status-icon.tsx";
import { StepInfo } from "../../../../common/RestClient.tsx";

export default function InputStep({ step }: { step: StepInfo }) {
  const inputStep = step.inputStep!;

  return (
    <div className="pgv-input-step">
      <div className="pgv-step-detail-header__content">
        <StatusIcon status={step.state} />
        <span>{inputStep.message}</span>
      </div>
      <InputApprovers
        input={inputStep}
        className="pgv-input-step__approvers jenkins-!-text-color-secondary"
      />
      <InputStepControls
        input={inputStep}
        baseUrl={`../input/${inputStep.id}/`}
        className="pgv-input-step__controls"
      />
    </div>
  );
}
