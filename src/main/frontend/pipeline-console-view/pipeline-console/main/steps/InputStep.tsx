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
      <InputStepControls
        input={inputStep}
        baseUrl={`../input/${inputStep.id}/`}
        className="pgv-input-step__controls"
      />
    </div>
  );
}
