/*
 Drives the parameter-input modal shipped by pipeline-input-step. That plugin ships the dialog
 form (InputStepExecution/dialog.jelly) but doesn't ship anything else for using it,
 so the lifecycle lives here: fetch the form, mount it in a <dialog>, re-run the adjunct scripts
 it pulls in (e.g., the credentials dropdown), and post the result to the input REST endpoints.
*/
import { CLOSE_ICON } from "../../../../common/components/close-icon.ts";

interface OpenInputStepDialogOptions {
  message: string;
}

/**
 * Opens the input-step parameter dialog.
 *
 * @param baseUrl the input endpoint prefix, e.g. `../input/{id}/`, ending in a slash. The dialog is
 * fetched from `${baseUrl}dialog` and submitted to `${baseUrl}proceed` / `${baseUrl}abort`.
 * @param options.message the input message, used as the dialog title when the server does not
 * supply an `X-Dialog-Title` header.
 */
export function openInputStepDialog(
  baseUrl: string,
  { message }: OpenInputStepDialogOptions,
): void {
  (async () => {
    try {
      const response = await fetch(baseUrl + "dialog", {
        headers: { Accept: "text/html" },
      });
      if (!response.ok) {
        showFetchError(response.status);
        return;
      }
      const titleText = response.headers.get("X-Dialog-Title") ?? message;
      const html = await response.text();
      mountDialog(html, baseUrl, titleText);
    } catch (err) {
      console.error(err);
    }
  })();
}

function showFetchError(status: number): void {
  if (status === 404) {
    window.notificationBar.show(
      "Error: Input has already been submitted",
      window.notificationBar.ERROR,
    );
  } else {
    window.notificationBar.show(
      "An error occurred when fetching the dialog: " + status,
      window.notificationBar.ERROR,
    );
  }
}

function mountDialog(html: string, baseUrl: string, titleText: string): void {
  const dialog = document.createElement("dialog");
  dialog.className = "jenkins-dialog";
  dialog.append(buildTitleBar(dialog, titleText), buildContents(html, baseUrl));
  document.body.appendChild(dialog);

  // innerHTML doesn't execute <script> tags pulled in by <st:adjunct> (e.g. select.js for the
  // credentials parameter's filling dropdown). Recreate them so the browser loads + runs them,
  // then apply Behaviour once the last external script has loaded.
  recreateScriptsAndApplyBehaviours(dialog);

  const cleanup = () => {
    if (dialog.open) {
      dialog.close();
    }
    dialog.remove();
  };
  dialog.addEventListener("close", cleanup, { once: true });
  dialog.addEventListener("cancel", cleanup, { once: true });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      cleanup();
    }
  });

  dialog.showModal();
}

function buildTitleBar(
  dialog: HTMLDialogElement,
  titleText: string,
): HTMLElement {
  const titleBar = document.createElement("div");
  titleBar.className = "jenkins-dialog__title";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = titleText;
  titleBar.appendChild(titleSpan);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className =
    "jenkins-dialog__title__button jenkins-dialog__title__close-button jenkins-button";
  closeButton.innerHTML = `<span class="jenkins-visually-hidden">Close</span>${CLOSE_ICON}`;
  closeButton.addEventListener("click", () =>
    dialog.dispatchEvent(new Event("cancel")),
  );
  titleBar.appendChild(closeButton);

  return titleBar;
}

function buildContents(html: string, baseUrl: string): HTMLElement {
  const body = document.createElement("div");
  body.className = "jenkins-dialog__contents";
  body.innerHTML = html;

  const form = body.querySelector<HTMLFormElement>(
    "form.input-step-dialog-form",
  );
  if (form) {
    attachSubmitHandler(form, baseUrl);
  }
  return body;
}

function attachSubmitHandler(form: HTMLFormElement, baseUrl: string): void {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const abort =
      (event as SubmitEvent).submitter?.getAttribute("name") === "abort";

    const buttons = form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      "button[name='proceed'], button[name='abort'], input[type='submit']",
    );
    const setDisabled = (disabled: boolean) =>
      buttons.forEach((b) => (b.disabled = disabled));

    let requestUrl = baseUrl + "abort";
    let body: BodyInit | undefined;
    if (!abort) {
      // buildFormTree serialises the parameter fields into the form's `json` field; it returns
      // false (and reports validation errors inline) when the form is invalid.
      if (!window.buildFormTree(form)) {
        return;
      }
      requestUrl = baseUrl + "proceed";
      body = new FormData(form);
    }

    const closeDialog = () =>
      form.closest("dialog")?.dispatchEvent(new Event("cancel"));

    setDisabled(true);
    (async () => {
      try {
        const response = await fetch(requestUrl, {
          method: "POST",
          body,
          headers: window.crumb.wrap({}),
        });
        if (response.ok) {
          closeDialog();
          return;
        }
        console.error("input-step dialog submit failed", response);
        if (response.status === 404) {
          window.notificationBar.show(
            "Error: Input has already been submitted",
            window.notificationBar.ERROR,
          );
          // The input is already settled, so there is nothing left to do in the dialog.
          closeDialog();
        } else if (response.status === 400) {
          const json = await response.json();
          window.notificationBar.show(
            json.message,
            window.notificationBar.ERROR,
          );
          setDisabled(false);
        } else {
          window.notificationBar.show(
            "Error: input-step dialog submit failed: " + response.status,
            window.notificationBar.ERROR,
          );
          setDisabled(false);
        }
      } catch (err) {
        console.error(err);
        window.notificationBar.show(
          "Error: " + err,
          window.notificationBar.ERROR,
        );
        setDisabled(false);
      }
    })();
  });
}

function recreateScriptsAndApplyBehaviours(root: HTMLElement): void {
  const scripts = Array.from(root.getElementsByTagName("script"));
  const apply = () => window.Behaviour.applySubtree(root, true);
  if (scripts.length === 0) {
    apply();
    return;
  }
  let pending = scripts.filter((s) => s.src).length;
  scripts.forEach((original) => {
    const replacement = document.createElement("script");
    for (const attr of original.attributes) {
      replacement.setAttribute(attr.name, attr.value);
    }
    if (original.text) {
      replacement.text = original.text;
    }
    if (replacement.src) {
      const onDone = () => {
        if (--pending === 0) {
          apply();
        }
      };
      replacement.addEventListener("load", onDone);
      replacement.addEventListener("error", onDone);
    }
    original.parentNode?.replaceChild(replacement, original);
  });
  if (pending === 0) {
    apply();
  }
}
