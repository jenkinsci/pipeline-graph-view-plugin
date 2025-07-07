import { ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownPortalProps {
  children: ReactNode;
  container: HTMLElement | null;
}

export default function DropdownPortal({
  children,
  container,
}: DropdownPortalProps) {
  if (!container) {
    console.error("DropdownPortal: Target container not found!");
    return null;
  }

  return createPortal(children, container);
}
