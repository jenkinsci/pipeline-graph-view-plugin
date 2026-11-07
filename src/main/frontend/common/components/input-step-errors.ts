import { LocalizedMessageKey, Messages } from "../i18n/index.ts";

/**
 * Why an input step endpoint refused a request. The input step puts its reason, such as the
 * user not being an allowed submitter, in the X-Error header of an HTML error page.
 */
export function inputErrorMessage(
  response: Response,
  messages: Messages,
): string {
  if (response.status === 404) {
    return messages.format(LocalizedMessageKey.inputAlreadySubmitted);
  }
  return (
    response.headers.get("X-Error") ||
    messages.format(LocalizedMessageKey.inputSubmitFailed, {
      "0": String(response.status),
    })
  );
}

export function showInputError(message: string): void {
  window.notificationBar.show(message, window.notificationBar.ERROR);
}
