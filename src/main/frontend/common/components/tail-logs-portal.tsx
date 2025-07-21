import { createPortal } from "react-dom";

import TailLogsButton, { TailLogsButtonProps } from "./tail-logs-button.tsx";

interface TailLogsPortalProps extends TailLogsButtonProps {
  container: HTMLElement | null;
}

export default function TailLogsPortal({
  container,
  complete,
  loading,
  tailLogs,
  startTailingLogs,
  stopTailingLogs,
}: TailLogsPortalProps) {
  if (!container) return null;
  return createPortal(
    <TailLogsButton
      complete={complete}
      loading={loading}
      tailLogs={tailLogs}
      startTailingLogs={startTailingLogs}
      stopTailingLogs={stopTailingLogs}
    />,
    container,
  );
}
