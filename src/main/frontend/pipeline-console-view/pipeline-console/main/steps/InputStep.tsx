import { useEffect, useRef } from "react";

import StatusIcon from "../../../../common/components/status-icon.tsx";
import { getInputDialog, StepInfo } from "../../../../common/RestClient.tsx";

declare global {
  interface Window {
    crumb: Crumb;
    Behaviour?: JenkinsBehaviour;
  }

  interface Crumb {
    wrap: (headers: Record<string, string>) => Record<string, string>;
  }

  interface JenkinsBehaviour {
    applySubtree: (node: Node, recursive?: boolean) => void;
  }
}

interface InputStepProps {
  step: StepInfo;
  currentRunPath: string;
}

export default function InputStep({ step, currentRunPath }: InputStepProps) {
  const inputStep = step.inputStep!;
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // If the step is removed (e.g. build aborted from another tab) while a dialog is open,
  // tear it down so it doesn't outlive the run it was bound to.
  useEffect(() => {
    return () => {
      dialogRef.current?.remove();
      dialogRef.current = null;
    };
  }, []);

  const post = (action: string) => {
    fetch(`../input/${encodeURIComponent(inputStep.id)}/${action}`, {
      method: "POST",
      headers: window.crumb.wrap({}),
    })
      .then((res) => {
        if (!res.ok) console.error(res);
        return true;
      })
      .catch((err) => console.error(err));
  };

  const proceedEmpty = () => post("proceedEmpty");
  const abort = () => post("abort");

  const openDialog = async () => {
    let html: string;
    try {
      html = await getInputDialog(currentRunPath, inputStep.id);
    } catch (err) {
      console.error(err);
      return;
    }
    dialogRef.current = showInputDialog({
      html,
      title: inputStep.message,
      runPath: currentRunPath,
      inputId: inputStep.id,
      onClosed: () => {
        dialogRef.current = null;
      },
    });
  };

  return (
    <div className="pgv-input-step">
      <div className="pgv-step-detail-header__content">
        <StatusIcon status={step.state} />
        <span>{inputStep.message}</span>
      </div>
      <div
        className={
          "jenkins-buttons-row jenkins-buttons-row--equal-width pgv-input-step__controls"
        }
      >
        <button
          onClick={inputStep.parameters ? openDialog : proceedEmpty}
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

interface ShowInputDialogArgs {
  html: string;
  title: string;
  runPath: string;
  inputId: string;
  onClosed: () => void;
}

function showInputDialog({
  html,
  title,
  runPath,
  inputId,
  onClosed,
}: ShowInputDialogArgs): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.className = "jenkins-dialog jenkins-dialog--scrollable";

  const heading = document.createElement("div");
  heading.className = "jenkins-dialog__title";
  heading.textContent = title;

  const body = document.createElement("div");
  body.className = "jenkins-dialog__contents";
  body.innerHTML = html;

  dialog.appendChild(heading);
  dialog.appendChild(body);
  document.body.appendChild(dialog);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    onClosed();
  };

  dialog.addEventListener("close", cleanup);
  dialog.addEventListener("cancel", cleanup);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) cleanup();
  });

  if (window.Behaviour) {
    try {
      window.Behaviour.applySubtree(body, true);
    } catch (err) {
      console.error("Behaviour.applySubtree failed", err);
    }
  }

  const form = body.querySelector(
    "form.input-step-dialog-form",
  ) as HTMLFormElement | null;
  if (!form) {
    console.error("input dialog returned no form");
    cleanup();
    return dialog;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = (event as SubmitEvent).submitter as
      | HTMLButtonElement
      | HTMLInputElement
      | null;
    const action = submitter?.name === "abort" ? "abort" : "proceed";

    const data = new FormData(form);
    data.set("inputAction", action);
    data.set("json", JSON.stringify(buildParameterPayload(form, action)));

    const submitButtons = form.querySelectorAll<HTMLButtonElement>(
      "button[name='proceed'], button[name='abort'], input[type='submit']",
    );
    submitButtons.forEach((b) => (b.disabled = true));

    try {
      const resp = await fetch(
        `${runPath}input/${encodeURIComponent(inputId)}/dialogSubmit`,
        {
          method: "POST",
          body: data,
          headers: window.crumb.wrap({}),
        },
      );
      if (!resp.ok) {
        console.error("dialogSubmit failed", resp);
        submitButtons.forEach((b) => (b.disabled = false));
        return;
      }
      cleanup();
    } catch (err) {
      console.error("dialogSubmit failed", err);
      submitButtons.forEach((b) => (b.disabled = false));
    }
  });

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }

  return dialog;
}

interface ParameterEntry {
  name: string;
  value: unknown;
}

interface ParameterPayload {
  parameter: ParameterEntry[];
  inputAction: string;
}

// Jenkins' workflow-input-step submit endpoint reads parameter values from a `parameter` JSON
// array via `request.getSubmittedForm()`. Normally Jenkins core's <f:form> submit handler
// builds that field by walking the form; we serialize ourselves because we POST via fetch and
// don't trigger Jenkins' own form-submit machinery.
function buildParameterPayload(
  form: HTMLFormElement,
  action: string,
): ParameterPayload {
  const parameters: ParameterEntry[] = [];
  const nameFields = form.querySelectorAll<HTMLInputElement>(
    'input[type="hidden"][name="name"]',
  );
  nameFields.forEach((nameField) => {
    const wrapper =
      nameField.closest(
        ".jenkins-form-item--medium, .jenkins-form-item, .form-group, tr",
      ) ?? form;
    const valueField = wrapper.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('[name="value"]');
    if (!valueField) return;
    let value: unknown;
    if (
      valueField instanceof HTMLInputElement &&
      valueField.type === "checkbox"
    ) {
      value = valueField.checked;
    } else {
      value = valueField.value;
    }
    parameters.push({ name: nameField.value, value });
  });
  return { parameter: parameters, inputAction: action };
}
