import StatusIcon from "../../../../common/components/status-icon.tsx";
import { StepInfo } from "../../../../common/RestClient.tsx";

declare global {
  interface Window {
    crumb: Crumb;
  }

  interface Crumb {
    wrap: (headers: Record<string, string>) => Record<string, string>;
  }
}

export default function InputStep({ step }: { step: StepInfo }) {
  const inputStep = step.inputStep!;
  function handler(id: string, action: string) {
    fetch(`../input/${id}/${action}`, {
      method: "POST",
      headers: window.crumb.wrap({}),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(res);
        }
        return true;
      })
      .catch((err) => {
        console.error(err);
      });
  }

  const ok = () => {
    return handler(inputStep.id, "proceedEmpty");
  };

  const abort = () => {
    return handler(inputStep.id, "abort");
  };

  return (
    <div className="pgv-input-step">
      <div className="pgv-step-detail-header__content">
        <StatusIcon status={step.state} percentage={step.completePercent} />
        <span>{inputStep.message}</span>
      </div>
      <div
        className={
          "jenkins-buttons-row jenkins-buttons-row--equal-width pgv-input-step__controls"
        }
      >
        <button
          onClick={ok}
          className={"jenkins-button jenkins-button--primary"}
        >
          {inputStep.ok}
        </button>
        <button onClick={abort} className={"jenkins-button"}>
          {inputStep.cancel}
        </button>
      </div>
    </div>
  );
}
