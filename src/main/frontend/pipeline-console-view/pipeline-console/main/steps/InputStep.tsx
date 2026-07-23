import StatusIcon from "../../../../common/components/status-icon.tsx";
import { StepInfo } from "../../../../common/RestClient.tsx";
import { openInputStepDialog } from "./inputStepDialog.ts";

export default function InputStep({ step }: { step: StepInfo }) {
  const inputStep = step.inputStep!;
  const baseUrl = `../input/${inputStep.id}/`;

  function post(action: string) {
    fetch(baseUrl + action, {
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

  const openDialog = () =>
    openInputStepDialog(baseUrl, { message: inputStep.message });

  return (
    <div className="pgv-input-step">
      <div className="pgv-step-detail-header__content">
        <StatusIcon status={step.state} />
        <span>{inputStep.message}</span>
      </div>
      {inputStep.parameters ? (
        <div className="pgv-input-step__controls">
          <button
            onClick={openDialog}
            className="jenkins-button jenkins-button--primary input-step-dialog-opener"
          >
            {inputStep.ok}
          </button>
        </div>
      ) : (
        <div
          className={
            "jenkins-buttons-row jenkins-buttons-row--equal-width pgv-input-step__controls"
          }
        >
          <button
            onClick={() => post("proceedEmpty")}
            className={"jenkins-button jenkins-button--primary"}
          >
            {inputStep.ok}
          </button>
          <button onClick={() => post("abort")} className={"jenkins-button"}>
            {inputStep.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
