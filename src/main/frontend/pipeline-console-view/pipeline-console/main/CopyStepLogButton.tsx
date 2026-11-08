import { useState } from "react";

import Tooltip from "../../../common/components/tooltip.tsx";
import { LocalizedMessageKey, useMessages } from "../../../common/i18n";

// CSI sequences (colours, cursor movement) and OSC sequences such as OSC 8 hyperlinks,
// which end in BEL or ST.
const ANSI_RE =
  // eslint-disable-next-line no-control-regex
  /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

async function fetchStepLog(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.text()).replace(ANSI_RE, "");
}

/**
 * Safari only allows clipboard writes during the click's user activation, which is lost
 * once the log fetch resolves. Handing ClipboardItem a promise keeps the write inside it.
 *
 * The clipboard is only available in secure contexts, so check for it before downloading
 * a log that could not be copied.
 */
async function copyToClipboard(loadText: () => Promise<string>) {
  const clipboard = navigator.clipboard;
  if (!clipboard) {
    throw new Error("The clipboard is not available in this context");
  }
  if (typeof ClipboardItem !== "undefined" && clipboard.write) {
    const blob = loadText().then((t) => new Blob([t], { type: "text/plain" }));
    await clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    return;
  }
  await clipboard.writeText(await loadText());
}

export default function CopyStepLogButton({ logUrl }: CopyStepLogButtonProps) {
  const messages = useMessages();
  const [copying, setCopying] = useState(false);
  const label = messages.format(LocalizedMessageKey.consoleCopy);

  const copy = async () => {
    setCopying(true);
    try {
      await copyToClipboard(() => fetchStepLog(logUrl));
      window.notificationBar?.show(
        messages.format(LocalizedMessageKey.consoleCopied),
        window.notificationBar.SUCCESS,
      );
    } catch (e) {
      console.error("Copying step output failed", e);
      window.notificationBar?.show(
        messages.format(LocalizedMessageKey.consoleCopyFailed),
        window.notificationBar.ERROR,
      );
    } finally {
      setCopying(false);
    }
  };

  return (
    <Tooltip content={label}>
      <button
        type="button"
        className={"jenkins-button jenkins-button--tertiary"}
        aria-label={label}
        disabled={copying}
        onClick={copy}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <rect
            x="128"
            y="128"
            width="336"
            height="336"
            rx="57"
            ry="57"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="32"
          />
          <path
            d="M383.5 128l.5-24a56.16 56.16 0 00-56-56H112a64.19 64.19 0 00-64 64v216a56.16 56.16 0 0056 56h24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
        </svg>
      </button>
    </Tooltip>
  );
}

interface CopyStepLogButtonProps {
  logUrl: string;
}
