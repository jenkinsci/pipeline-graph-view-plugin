/**
 * Shared SVG icon constants for the Build Flow view.
 * Extracted to reduce inline duplication in BuildFlow.tsx.
 */
import { ReactNode } from "react";

import Tooltip from "../../../common/components/tooltip.tsx";

const ion = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 512 512" };
const s = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: "32",
};
const s48 = { ...s, strokeWidth: "48" };
const s28 = { ...s, strokeWidth: "28" };

export const IconPlus = (
  <svg {...ion}>
    <path {...s} d="M256 112v288M400 256H112" />
  </svg>
);

export const IconMinus = (
  <svg {...ion}>
    <path {...s} d="M400 256H112" />
  </svg>
);

export const IconFitToView = (
  <svg className="ionicon" viewBox="0 0 512 512">
    <path
      d="M320 146s24.36-12-64-12a160 160 0 10160 160"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeMiterlimit="10"
      strokeWidth="32"
    />
    <path {...s} d="M256 58l80 80-80 80" />
  </svg>
);

export const IconChevronUp = (
  <svg {...ion}>
    <path {...s48} d="M112 328l144-144 144 144" />
  </svg>
);

export const IconChevronDown = (
  <svg {...ion}>
    <path {...s48} d="M112 184l144 144 144-144" />
  </svg>
);

export const IconChevronRight = (
  <svg {...ion}>
    <path {...s48} d="M184 112l144 144-144 144" />
  </svg>
);

export const IconBarChart = (
  <svg {...ion}>
    <path d="M32 32v432a16 16 0 0016 16h432" {...s} />
    <rect x="96" y="224" width="80" height="192" rx="8" {...s} />
    <rect x="224" y="128" width="80" height="288" rx="8" {...s} />
    <rect x="352" y="288" width="80" height="128" rx="8" {...s} />
  </svg>
);

export const IconRefreshCircle = (
  <svg {...ion}>
    <path
      d="M288 193s12.18-6-32-6a80 80 0 1080 80"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeMiterlimit="10"
      strokeWidth="28"
    />
    <path {...s28} d="M256 149l40 40-40 40" />
    <path
      d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
      fill="none"
      stroke="currentColor"
      strokeMiterlimit="10"
      strokeWidth="32"
    />
  </svg>
);

export const IconTime = (
  <svg {...ion}>
    <path
      d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
      fill="none"
      stroke="currentColor"
      strokeMiterlimit="10"
      strokeWidth="32"
    />
    <path {...s} d="M256 128v144h96" />
  </svg>
);

export const IconPricetag = (
  <svg {...ion}>
    <path
      d="M435.25 48h-122.9a14.46 14.46 0 00-10.2 4.2L56.45 297.9a28.85 28.85 0 000 40.7l117 117a28.85 28.85 0 0040.7 0L459.75 210a14.46 14.46 0 004.2-10.2v-123a28.66 28.66 0 00-28.7-28.8z"
      {...s}
    />
    <path d="M384 160a32 32 0 1132-32 32 32 0 01-32 32z" fill="currentColor" />
  </svg>
);

export const IconTrailSign = (
  <svg {...ion}>
    <path
      {...s}
      d="M256 400v64M256 208v64M256 48v32M416 208H102.63a16 16 0 01-11.32-4.69L32 144l59.31-59.31A16 16 0 01102.63 80H416a16 16 0 0116 16v96a16 16 0 01-16 16zM96 400h313.37a16 16 0 0011.32-4.69L480 336l-59.31-59.31a16 16 0 00-11.32-4.69H96a16 16 0 00-16 16v96a16 16 0 0016 16z"
    />
  </svg>
);

export const IconDocumentText = (
  <svg {...ion}>
    <path
      d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="32"
    />
    <path {...s} d="M256 56v120a32 32 0 0032 32h120M176 288h160M176 368h160" />
  </svg>
);

export const IconSwapHorizontal = (
  <svg {...ion}>
    <path
      {...s}
      d="M304 48l112 112-112 112M398 160H96M208 464L96 352l112-112M114 352h302"
    />
  </svg>
);

export const IconGitMerge = (
  <svg {...ion}>
    <circle cx="128" cy="96" r="48" {...s} />
    <circle cx="256" cy="416" r="48" {...s} />
    <path {...s} d="M256 256v112" />
    <circle cx="384" cy="96" r="48" {...s} />
    <path
      d="M128 144c0 74.67 68.92 112 128 112M384 144c0 74.67-68.92 112-128 112"
      {...s}
    />
  </svg>
);

export const IconGrid = (
  <svg {...ion}>
    <rect x="48" y="48" width="176" height="176" rx="20" {...s} />
    <rect x="288" y="48" width="176" height="176" rx="20" {...s} />
    <rect x="48" y="288" width="176" height="176" rx="20" {...s} />
    <rect x="288" y="288" width="176" height="176" rx="20" {...s} />
  </svg>
);

export const IconEllipsisVertical = (
  <svg {...ion}>
    <circle
      cx="256"
      cy="256"
      r="32"
      fill="none"
      stroke="currentColor"
      strokeMiterlimit="10"
      strokeWidth="32"
    />
    <circle
      cx="256"
      cy="416"
      r="32"
      fill="none"
      stroke="currentColor"
      strokeMiterlimit="10"
      strokeWidth="32"
    />
    <circle
      cx="256"
      cy="96"
      r="32"
      fill="none"
      stroke="currentColor"
      strokeMiterlimit="10"
      strokeWidth="32"
    />
  </svg>
);

export const IconClose = (
  <svg {...ion}>
    <path {...s} d="M368 368L144 144M368 144L144 368" />
  </svg>
);

export const IconExpand = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 4H15C15.5523 4 16 4.44772 16 5V10M10 16H5C4.44772 16 4 15.5523 4 15V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// --- Reusable toggle button helper ---

export function ToggleButton({
  icon,
  label,
  active,
  onToggle,
  tooltip,
  role = "menuitemcheckbox",
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
  tooltip?: string;
  role?: "menuitemcheckbox" | "menuitem";
}) {
  const btn = (
    <button
      className={`jenkins-button jenkins-button--tertiary${active ? " pgv-build-flow__toggle--active" : ""}`}
      onClick={onToggle}
      role={role}
      aria-checked={role === "menuitemcheckbox" ? active : undefined}
      aria-pressed={!tooltip ? undefined : active}
      aria-label={tooltip}
    >
      {icon}
      {label}
    </button>
  );
  return tooltip ? <Tooltip content={tooltip}>{btn}</Tooltip> : btn;
}
