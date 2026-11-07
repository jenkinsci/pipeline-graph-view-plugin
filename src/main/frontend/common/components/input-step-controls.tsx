import { InputStep } from "../RestClient.tsx";
import { classNames } from "../utils/classnames.ts";
import { openInputStepDialog } from "./input-step-dialog.ts";

/**
 * Proceed / abort buttons for a paused input step.
 *
 * @param baseUrl the input endpoint prefix for this input, ending in a slash,
 * e.g. `../input/{id}/` or `/jenkins/job/foo/1/input/{id}/`.
 */
export default function InputStepControls({
  input,
  baseUrl,
  className,
  onAction,
}: {
  input: InputStep;
  baseUrl: string;
  className?: string;
  /** Called after either button is clicked. */
  onAction?: () => void;
}) {
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
    openInputStepDialog(baseUrl, { message: input.message });

  return (
    <div
      className={classNames(
        "jenkins-buttons-row jenkins-buttons-row--equal-width",
        { [className ?? ""]: !!className },
      )}
    >
      <button
        onClick={() => {
          if (input.parameters) {
            openDialog();
          } else {
            post("proceedEmpty");
          }
          onAction?.();
        }}
        className={
          input.parameters
            ? "jenkins-button jenkins-button--primary input-step-dialog-opener"
            : "jenkins-button jenkins-button--primary"
        }
      >
        {input.ok}
      </button>
      <button
        onClick={() => {
          post("abort");
          onAction?.();
        }}
        className={"jenkins-button"}
      >
        {input.cancel}
      </button>
    </div>
  );
}
