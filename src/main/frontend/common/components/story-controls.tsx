import { ReactNode } from "react";

/**
 * Small controls for a story, pinned to the bottom left so they're out of the way of the
 * centered story whatever its size. Children are rows of a label, a control and its value.
 */
export default function StoryControls({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "2rem",
        display: "grid",
        // Fixed width values, so the controls don't move as they change
        gridTemplateColumns: "auto 160px 7rem",
        alignItems: "center",
        gap: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        color: "var(--text-color-secondary)",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </div>
  );
}
