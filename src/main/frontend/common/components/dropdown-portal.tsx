import { ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownPortalProps {
  children: ReactNode;
}

export default function DropdownPortal({ children }: DropdownPortalProps) {
  const container = document.getElementById("console-pipeline-overflow-root");

  if (!container) {
    console.error("DropdownPortal: Target container not found!");
    return null;
  }

  return createPortal(children, container);
}
