import React from "react";
import ReactDOM from "react-dom";

interface DropdownPortalProps {
  children: React.ReactNode;
}

export default function DropdownPortal({ children }: DropdownPortalProps) {
  const container = document.getElementById("console-pipeline-overflow-root");

  if (!container) {
    console.error("DropdownPortal: Target container not found!");
    return null;
  }

  return ReactDOM.createPortal(children, container);
}
