import StatusIcon from "../../../../common/components/status-icon.tsx";
import { ConsoleLogCardProps } from "../ConsoleLogCard.tsx";

declare global {
  interface Window {
    crumb: Crumb;
  }

  interface Crumb {
    wrap: (headers: Record<string, string>) => Record<string, string>;
  }
}

export default function InputStep(props: ConsoleLogCardProps) {
  const inputStep = props.step.inputStep!;

  function handler(id: string, action: string) {
    const formData = new FormData();
    formData.append("proceed", "Proceed");
    formData.append("json", `{"proceed":"Proceed","abort":"Abort"}`);

    fetch(`../input/${id}/${action}`, {
      method: "POST",
      body: new URLSearchParams(formData as any),
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
    return handler(inputStep.id, "proceed");
  };

  const abort = () => {
    return handler(inputStep.id, "abort");
  };

  return (
    <div className="pgv-input-step">
      <div className="pgv-step-detail-header__content">
        <StatusIcon
          status={props.step.state}
          percentage={props.step.completePercent}
        />
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
