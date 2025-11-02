import { LocalizedMessageKey, useMessages } from "../i18n";
import Tooltip from "./tooltip.tsx";

export interface TailLogsButtonProps {
  complete: boolean;
  loading: boolean;
  tailLogs: boolean;
  startTailingLogs: () => void;
  stopTailingLogs: () => void;
}

export default function TailLogsButton({
  complete,
  loading,
  tailLogs,
  startTailingLogs,
  stopTailingLogs,
}: TailLogsButtonProps) {
  const messages = useMessages();
  if (loading || complete) return null;

  return (
    <Tooltip
      content={
        tailLogs
          ? messages.format(LocalizedMessageKey.tailLogsPause)
          : messages.format(LocalizedMessageKey.tailLogsResume)
      }
    >
      <button
        className={"jenkins-button jenkins-!-info-color"}
        onClick={tailLogs ? stopTailingLogs : startTailingLogs}
      >
        {tailLogs ? pauseIcon() : playIcon()}
      </button>
    </Tooltip>
  );
}

// play-circle-outline.svg
function playIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="ionicon"
      viewBox="0 0 512 512"
    >
      <path
        d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <path
        d="M216.32 334.44l114.45-69.14a10.89 10.89 0 000-18.6l-114.45-69.14a10.78 10.78 0 00-16.32 9.31v138.26a10.78 10.78 0 0016.32 9.31z"
        fill="currentColor"
      />
    </svg>
  );
}

// pause-circle-outline.svg
function pauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="ionicon"
      viewBox="0 0 512 512"
    >
      <path
        d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
        d="M208 192v128M304 192v128"
      />
    </svg>
  );
}
