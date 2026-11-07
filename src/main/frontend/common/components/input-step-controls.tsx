import { LocalizedMessageKey, useMessages } from "../i18n/index.ts";
import { InputStep } from "../RestClient.tsx";
import { classNames } from "../utils/classnames.ts";
import { openInputStepDialog } from "./input-step-dialog.ts";
import { inputErrorMessage, showInputError } from "./input-step-errors.ts";

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
  const messages = useMessages();

  async function post(action: string) {
    try {
      const response = await fetch(baseUrl + action, {
        method: "POST",
        headers: window.crumb.wrap({}),
      });
      if (!response.ok) {
        showInputError(inputErrorMessage(response, messages));
      }
    } catch (err) {
      console.error(err);
      showInputError(
        messages.format(LocalizedMessageKey.inputSubmitFailed, {
          "0": String(err),
        }),
      );
    }
  }

  const openDialog = () =>
    openInputStepDialog(baseUrl, { message: input.message, messages });

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
