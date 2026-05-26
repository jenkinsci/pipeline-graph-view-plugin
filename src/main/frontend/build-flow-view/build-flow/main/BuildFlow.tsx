import "./BuildFlow.scss";

import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactZoomPanPinchContentRef,
  ReactZoomPanPinchContextState,
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";

import Tooltip from "../../../common/components/tooltip.tsx";
import {
  LocalizedMessageKey,
  useMessages,
} from "../../../common/i18n/index.ts";
import {
  BuildFlowNodeModel,
  BuildFlowResponseModel,
} from "../model/BuildFlowModel.ts";
import {
  computeFlatLayout,
  computeLayout,
  computeNodeWidth,
  formatDuration,
  formatStatus,
  type LayoutDirection,
  type LayoutNode,
  NODE_HEIGHT,
  NODE_WIDTH_MIN,
  PADDING,
} from "./BuildFlowLayout.ts";
import {
  getBaseUrl,
  getRootUrl,
  isFullPageContext,
  resultDotColor,
  shouldShowHeading,
  statusClass,
  statusColor,
} from "./BuildFlowUtils.ts";

// --- Component-specific constants ---
const MAX_SCALE = 3;
const CONTROLS_OVERHEAD = 80; // px reserved for zoom/toggle overlays
const MIN_CONTAINER_HEIGHT = 150;
const MAX_CONTAINER_HEIGHT = 350;

const STORAGE_KEY = "pgv-build-flow-prefs";

// --- Preferences persistence ---

interface BuildFlowPrefs {
  showUpstream: boolean;
  showDownstream: boolean;
  layoutDirection: "LTR" | "TTB";
  showDuration: boolean;
  showBuildNumber: boolean;
  showFullNames: boolean;
  showDescription: boolean;
  showBuildHistory: boolean;
  flattenGraph: boolean;
  autoRefresh: boolean;
}

const DEFAULT_PREFS: BuildFlowPrefs = {
  showUpstream: true,
  showDownstream: true,
  layoutDirection: "LTR",
  showDuration: true,
  showBuildNumber: true,
  showFullNames: false,
  showDescription: false,
  showBuildHistory: false,
  flattenGraph: false,
  autoRefresh: true,
};

function loadPrefs(): BuildFlowPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: BuildFlowPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// --- Helpers ---

/** Live-updating duration for in-progress builds */
const LiveDuration: FunctionComponent<{ startTimeMs: number }> = ({
  startTimeMs,
}) => {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTimeMs);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTimeMs), 1000);
    return () => clearInterval(id);
  }, [startTimeMs]);
  return <span>{formatDuration(elapsed)}</span>;
};

// --- Build History Dots ---

const BuildHistoryDots: FunctionComponent<{
  node: BuildFlowNodeModel;
  rootUrl: string;
}> = ({ node, rootUrl }) => {
  // API returns newest-first; reverse so dots go oldest (left) to newest (right)
  const history = [...node.recentResults!].reverse();
  return (
    <span className="pgv-build-flow__node-history">
      {history.map((r, i) => {
        const buildNum = node.buildNumber - (history.length - 1 - i);
        return (
          <Tooltip key={i} content={`#${buildNum} - ${formatStatus(r)}`}>
            <a
              className="pgv-build-flow__history-dot"
              style={{ background: resultDotColor(r) }}
              href={
                node.url
                  ? `${rootUrl}/${node.url.replace(/\/\d+\/$/, `/${buildNum}/`)}`
                  : undefined
              }
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        );
      })}
    </span>
  );
};

// --- Node Card ---

const BuildFlowNodeCard: FunctionComponent<{
  layout: LayoutNode;
  rootUrl: string;
  nodeWidth: number;
  showDuration: boolean;
  showBuildNumber: boolean;
  showFullNames: boolean;
  showDescription: boolean;
  showBuildHistory: boolean;
}> = ({
  layout,
  rootUrl,
  nodeWidth,
  showDuration,
  showBuildNumber,
  showFullNames,
  showDescription,
  showBuildHistory,
}) => {
  const { node, x, y } = layout;
  const classes = [
    "pgv-build-flow__node",
    statusClass(node.status),
    node.isCurrentBuild ? "pgv-build-flow__node--current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const href = node.url ? `${rootUrl}/${node.url}` : undefined;
  const name = showFullNames ? node.jobFullName : node.jobName;

  return (
    <foreignObject x={x} y={y} width={nodeWidth} height={NODE_HEIGHT}>
      <a className={classes} href={href} title={node.displayName}>
        <span className="pgv-build-flow__node-name">{name}</span>
        <span className="pgv-build-flow__node-meta">
          {showBuildNumber && <span>#{node.buildNumber}</span>}
          {showDuration && node.durationMs != null && (
            <span>{formatDuration(node.durationMs)}</span>
          )}
          {showDuration &&
            node.status === "IN_PROGRESS" &&
            node.startTimeMs != null && (
              <LiveDuration startTimeMs={node.startTimeMs} />
            )}
        </span>
        {showDescription && node.description && (
          <span className="pgv-build-flow__node-desc">{node.description}</span>
        )}
        {showBuildHistory &&
          node.recentResults &&
          node.recentResults.length > 0 && (
            <BuildHistoryDots node={node} rootUrl={rootUrl} />
          )}
      </a>
    </foreignObject>
  );
};

// --- Edge ---

const BuildFlowEdge: FunctionComponent<{
  from: LayoutNode;
  to: LayoutNode;
  sourceStatus: string;
  direction: LayoutDirection;
  nodeWidth: number;
}> = ({ from, to, sourceStatus, direction, nodeWidth }) => {
  let x1: number, y1: number, x2: number, y2: number;

  if (direction === "LTR") {
    x1 = from.x + nodeWidth;
    y1 = from.y + NODE_HEIGHT / 2;
    x2 = to.x;
    y2 = to.y + NODE_HEIGHT / 2;
  } else {
    x1 = from.x + nodeWidth / 2;
    y1 = from.y + NODE_HEIGHT;
    x2 = to.x + nodeWidth / 2;
    y2 = to.y;
  }

  // Bezier control points - always exit/enter along the main axis
  let path: string;
  if (direction === "LTR") {
    const offset = Math.max(30, Math.abs(x2 - x1) * 0.4);
    path = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
  } else {
    // TTB: exit straight down, enter straight down into target
    const offset = Math.max(30, Math.abs(y2 - y1) * 0.4);
    path = `M ${x1} ${y1} C ${x1} ${y1 + offset}, ${x2} ${y2 - offset}, ${x2} ${y2}`;
  }

  const edgeClass =
    sourceStatus === "IN_PROGRESS"
      ? "pgv-build-flow__edge pgv-build-flow__edge--in-progress"
      : "pgv-build-flow__edge";

  return (
    <g className={edgeClass}>
      <path
        d={path}
        fill="none"
        stroke={statusColor(sourceStatus)}
        strokeWidth={2}
      />
    </g>
  );
};

// --- Zoom Controls (matches Stages card exactly) ---

function ZoomControls({
  initialScale,
  minScale,
}: {
  initialScale: number;
  minScale: number;
}) {
  const { zoomIn, zoomOut, centerView } = useControls();
  const [scale, setScale] = useState(initialScale);
  const [isTransformed, setIsTransformed] = useState(false);
  const handleTransformEffect = useCallback(
    (ref: ReactZoomPanPinchContextState) => {
      setScale(ref.state.scale);
      // Consider "transformed" if scale differs OR position is non-default
      const s = ref.state;
      const scaleDiff = Math.abs(s.scale - initialScale) > 0.01;
      const positionDiff =
        Math.abs(s.positionX) > 5 || Math.abs(s.positionY) > 5;
      setIsTransformed(scaleDiff || positionDiff);
    },
    [initialScale],
  );
  useTransformEffect(handleTransformEffect);

  return (
    <div className="pgv-build-flow__controls pgw-zoom-controls">
      <Tooltip content={"Zoom in"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomIn()}
          disabled={scale >= MAX_SCALE}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M256 112v288M400 256H112"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content={"Zoom out"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomOut()}
          disabled={scale <= minScale}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M400 256H112"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content={"Fit to view"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => centerView(initialScale)}
          disabled={!isTransformed}
        >
          <svg className="ionicon" viewBox="0 0 512 512">
            <path
              d="M320 146s24.36-12-64-12a160 160 0 10160 160"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M256 58l80 80-80 80"
            />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

// --- Toggle Controls ---

interface ToggleControlsProps {
  showUpstream: boolean;
  setShowUpstream: (v: boolean) => void;
  showDownstream: boolean;
  setShowDownstream: (v: boolean) => void;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (v: LayoutDirection) => void;
  showDuration: boolean;
  setShowDuration: (v: boolean) => void;
  showBuildNumber: boolean;
  setShowBuildNumber: (v: boolean) => void;
  showFullNames: boolean;
  setShowFullNames: (v: boolean) => void;
  showDescription: boolean;
  setShowDescription: (v: boolean) => void;
  showBuildHistory: boolean;
  setShowBuildHistory: (v: boolean) => void;
  flattenGraph: boolean;
  setFlattenGraph: (v: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
}

const ToggleControls: FunctionComponent<ToggleControlsProps> = ({
  showUpstream,
  setShowUpstream,
  showDownstream,
  setShowDownstream,
  layoutDirection,
  setLayoutDirection,
  showDuration,
  setShowDuration,
  showBuildNumber,
  setShowBuildNumber,
  showFullNames,
  setShowFullNames,
  showDescription,
  setShowDescription,
  showBuildHistory,
  setShowBuildHistory,
  flattenGraph,
  setFlattenGraph,
  autoRefresh,
  setAutoRefresh,
}) => {
  return (
    <div
      className="pgv-build-flow__controls pgv-build-flow__toggle-controls"
      role="toolbar"
      aria-label="Build flow display options"
    >
      <Tooltip content={showUpstream ? "Hide upstream" : "Show upstream"}>
        <button
          className={`jenkins-button jenkins-button--tertiary${showUpstream ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowUpstream(!showUpstream)}
          aria-label="Toggle upstream builds"
          aria-pressed={showUpstream}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
              d="M112 328l144-144 144 144"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content={showDownstream ? "Hide downstream" : "Show downstream"}>
        <button
          className={`jenkins-button jenkins-button--tertiary${showDownstream ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowDownstream(!showDownstream)}
          aria-label="Toggle downstream builds"
          aria-pressed={showDownstream}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
              d="M112 184l144 144 144-144"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip
        content={
          layoutDirection === "LTR"
            ? "Switch to top-to-bottom"
            : "Switch to left-to-right"
        }
      >
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          style={{
            transform: layoutDirection === "TTB" ? "rotate(90deg)" : undefined,
          }}
          onClick={() =>
            setLayoutDirection(layoutDirection === "LTR" ? "TTB" : "LTR")
          }
          aria-label="Toggle layout direction"
        >
          {/* swap-horizontal-outline */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M304 48l112 112-112 112M398 160H96M208 464L96 352l112-112M114 352h302"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content={showDuration ? "Hide time" : "Show time"}>
        <button
          className={`jenkins-button jenkins-button--tertiary${showDuration ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowDuration(!showDuration)}
          aria-label="Toggle duration"
          aria-pressed={showDuration}
        >
          {/* time-outline */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M256 128v144h96"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip
        content={showBuildNumber ? "Hide build number" : "Show build number"}
      >
        <button
          className={`jenkins-button jenkins-button--tertiary${showBuildNumber ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowBuildNumber(!showBuildNumber)}
          aria-label="Toggle build number"
          aria-pressed={showBuildNumber}
        >
          {/* pricetag-outline - clean tag/label icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M435.25 48h-122.9a14.46 14.46 0 00-10.2 4.2L56.45 297.9a28.85 28.85 0 000 40.7l117 117a28.85 28.85 0 0040.7 0L459.75 210a14.46 14.46 0 004.2-10.2v-123a28.66 28.66 0 00-28.7-28.8z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <path
              d="M384 160a32 32 0 1132-32 32 32 0 01-32 32z"
              fill="currentColor"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content={showFullNames ? "Show short names" : "Show full names"}>
        <button
          className={`jenkins-button jenkins-button--tertiary${showFullNames ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowFullNames(!showFullNames)}
          aria-label="Toggle full names"
          aria-pressed={showFullNames}
        >
          {/* trail-sign-outline - signpost for path/full name */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M256 400v64M256 208v64M256 48v32M416 208H102.63a16 16 0 01-11.32-4.69L32 144l59.31-59.31A16 16 0 01102.63 80H416a16 16 0 0116 16v96a16 16 0 01-16 16zM96 400h313.37a16 16 0 0011.32-4.69L480 336l-59.31-59.31a16 16 0 00-11.32-4.69H96a16 16 0 00-16 16v96a16 16 0 0016 16z"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip
        content={showDescription ? "Hide description" : "Show description"}
      >
        <button
          className={`jenkins-button jenkins-button--tertiary${showDescription ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowDescription(!showDescription)}
          aria-label="Toggle description"
          aria-pressed={showDescription}
        >
          {/* document-text-outline */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z"
              fill="none"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <path
              d="M256 56v120a32 32 0 0032 32h120M176 288h160M176 368h160"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip
        content={showBuildHistory ? "Hide build history" : "Show build history"}
      >
        <button
          className={`jenkins-button jenkins-button--tertiary${showBuildHistory ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setShowBuildHistory(!showBuildHistory)}
          aria-label="Toggle build history"
          aria-pressed={showBuildHistory}
        >
          {/* bar-chart-outline */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M32 32v432a16 16 0 0016 16h432"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <rect
              x="96"
              y="224"
              width="80"
              height="192"
              rx="8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <rect
              x="224"
              y="128"
              width="80"
              height="288"
              rx="8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <rect
              x="352"
              y="288"
              width="80"
              height="128"
              rx="8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content={flattenGraph ? "Show graph layout" : "Flatten to grid"}>
        <button
          className={`jenkins-button jenkins-button--tertiary${flattenGraph ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setFlattenGraph(!flattenGraph)}
          aria-label="Toggle flatten graph"
          aria-pressed={flattenGraph}
        >
          {flattenGraph ? (
            /* git-network-outline - show graph */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <circle
                cx="128"
                cy="96"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <circle
                cx="256"
                cy="416"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
                d="M256 256v112"
              />
              <circle
                cx="384"
                cy="96"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <path
                d="M128 144c0 74.67 68.92 112 128 112M384 144c0 74.67-68.92 112-128 112"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
            </svg>
          ) : (
            /* grid-outline - flatten to grid */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <rect
                x="48"
                y="48"
                width="176"
                height="176"
                rx="20"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <rect
                x="288"
                y="48"
                width="176"
                height="176"
                rx="20"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <rect
                x="48"
                y="288"
                width="176"
                height="176"
                rx="20"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <rect
                x="288"
                y="288"
                width="176"
                height="176"
                rx="20"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
            </svg>
          )}
        </button>
      </Tooltip>
      <Tooltip
        content={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
      >
        <button
          className={`jenkins-button jenkins-button--tertiary${autoRefresh ? " pgv-build-flow__toggle--active" : ""}`}
          onClick={() => setAutoRefresh(!autoRefresh)}
          aria-label="Toggle auto-refresh"
          aria-pressed={autoRefresh}
        >
          {/* refresh-circle-outline */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M288 193s12.18-6-32-6a80 80 0 1080 80"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeMiterlimit="10"
              strokeWidth="28"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="28"
              d="M256 149l40 40-40 40"
            />
            <path
              d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
};

// --- Main Component ---

export const BuildFlow: FunctionComponent = () => {
  const messages = useMessages();
  const [data, setData] = useState<BuildFlowResponseModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Track container size via ResizeObserver (like Stages)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load persisted preferences
  const [prefs, setPrefs] = useState<BuildFlowPrefs>(loadPrefs);

  const updatePref = useCallback(
    <K extends keyof BuildFlowPrefs>(key: K, value: BuildFlowPrefs[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        savePrefs(next);
        return next;
      });
    },
    [],
  );

  const baseUrl = getBaseUrl();
  const rootUrl = getRootUrl();
  const showHeading = shouldShowHeading();

  const nodeWidth = useMemo(() => {
    if (!data || data.nodes.length === 0) return NODE_WIDTH_MIN;
    return computeNodeWidth(data.nodes, prefs.showFullNames);
  }, [data, prefs.showFullNames]);

  const fetchData = useCallback(async () => {
    if (!baseUrl) {
      setError("No build URL configured");
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (!prefs.showUpstream) params.set("showUpstream", "false");
      if (!prefs.showDownstream) params.set("showDownstream", "false");
      const qs = params.toString();
      const url = `${rootUrl}/${baseUrl}build-flow/api${qs ? `?${qs}` : ""}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json.data as BuildFlowResponseModel);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, rootUrl, prefs.showUpstream, prefs.showDownstream]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (prefs.autoRefresh && data?.isAnyBuildOngoing) {
      timerRef.current = setInterval(fetchData, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [prefs.autoRefresh, data?.isAnyBuildOngoing, fetchData]);

  const layout = useMemo(() => {
    if (!data || data.nodes.length === 0) return null;
    if (prefs.flattenGraph) return computeFlatLayout(data.nodes, nodeWidth);
    return computeLayout(
      data.nodes,
      data.edges,
      prefs.layoutDirection,
      nodeWidth,
    );
  }, [data, prefs.layoutDirection, prefs.flattenGraph, nodeWidth]);

  // Compute initialScale: fit SVG into container minus overlay padding
  const svgWidth = layout?.width ?? 0;
  const svgHeight = layout?.height ?? 0;
  const initialScale = useMemo(() => {
    if (!containerWidth || !containerHeight || !svgWidth || !svgHeight)
      return 1;
    // Reserve space for heading overlay (top) and toggle controls (bottom)
    const availWidth = containerWidth - 20;
    const availHeight = containerHeight - 80;
    if (availWidth <= 0 || availHeight <= 0) return 1;
    return Math.min(1, availWidth / svgWidth, availHeight / svgHeight);
  }, [containerWidth, containerHeight, svgWidth, svgHeight]);
  const minScale = initialScale * 0.5;

  // Auto-fit when layout changes (initial load, toggle upstream/downstream, direction change)
  const lastLayoutKey = useRef("");
  useEffect(() => {
    const layoutKey = `${containerWidth}:${containerHeight}:${svgWidth}x${svgHeight}`;
    if (layoutKey === lastLayoutKey.current) return;
    lastLayoutKey.current = layoutKey;
    if (!containerWidth || !containerHeight || !svgWidth || !svgHeight) return;
    const ref = transformRef.current;
    if (!ref) return;
    const scale = Math.max(initialScale, 0.5);
    // setTimeout ensures TransformWrapper is fully mounted and measured
    const timer = setTimeout(() => ref.centerView(scale), 50);
    return () => clearTimeout(timer);
  }, [containerWidth, containerHeight, svgWidth, svgHeight, initialScale]);

  if (loading) {
    return (
      <div className="pgv-build-flow">
        <span className="pgv-build-flow__loading">
          {messages.format(LocalizedMessageKey.buildFlowLoading)}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pgv-build-flow">
        <span className="pgv-build-flow__error">
          {messages.format(LocalizedMessageKey.buildFlowError, { 0: error })}
        </span>
      </div>
    );
  }

  if (!data || data.nodes.length === 0 || !layout) {
    return (
      <div className="pgv-build-flow">
        <span className="pgv-build-flow__empty">
          {messages.format(LocalizedMessageKey.buildFlowEmpty)}
        </span>
      </div>
    );
  }

  const { layoutNodes, width, height } = layout;
  const nodeById = new Map(layoutNodes.map((ln) => [ln.node.id, ln]));

  const isFullPage = isFullPageContext();
  const containerClasses = [
    "pgv-build-flow",
    isExpanded && "pgv-build-flow--expanded",
    isFullPage && "pgv-build-flow--full-page",
  ]
    .filter(Boolean)
    .join(" ");

  // Dynamic height for job page: grow from small to max based on graph size
  const isJobPageContext = !isFullPage && !showHeading && !isExpanded;
  const dynamicHeight =
    isJobPageContext && height > 0
      ? Math.min(
          MAX_CONTAINER_HEIGHT,
          Math.max(MIN_CONTAINER_HEIGHT, height + CONTROLS_OVERHEAD),
        )
      : undefined;

  return (
    <div
      ref={wrapperRef}
      className={containerClasses}
      style={dynamicHeight ? { height: dynamicHeight } : undefined}
    >
      {showHeading && !isExpanded && (
        <a
          className="pgv-build-flow__controls pgv-build-flow__heading"
          href="build-flow"
        >
          {messages.format(LocalizedMessageKey.buildFlowTitle)}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
              d="M184 112l144 144-144 144"
            />
          </svg>
        </a>
      )}
      {(showHeading || isExpanded) && (
        <div className="pgv-build-flow__controls pgw-fullscreen-controls">
          <Tooltip content={isExpanded ? "Close" : "Expand"}>
            <button
              className={"jenkins-button jenkins-button--tertiary"}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    d="M368 368L144 144M368 144L144 368"
                  />
                </svg>
              ) : (
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
              )}
            </button>
          </Tooltip>
        </div>
      )}
      <TransformWrapper
        initialScale={initialScale}
        minScale={minScale}
        maxScale={MAX_SCALE}
        centerOnInit={true}
        wheel={{ activationKeys: isExpanded ? [] : ["Control"] }}
        ref={transformRef}
      >
        <ZoomControls initialScale={initialScale} minScale={minScale} />
        <ToggleControls
          showUpstream={prefs.showUpstream}
          setShowUpstream={(v) => updatePref("showUpstream", v)}
          showDownstream={prefs.showDownstream}
          setShowDownstream={(v) => updatePref("showDownstream", v)}
          layoutDirection={prefs.layoutDirection}
          setLayoutDirection={(v) => updatePref("layoutDirection", v)}
          showDuration={prefs.showDuration}
          setShowDuration={(v) => updatePref("showDuration", v)}
          showBuildNumber={prefs.showBuildNumber}
          setShowBuildNumber={(v) => updatePref("showBuildNumber", v)}
          showFullNames={prefs.showFullNames}
          setShowFullNames={(v) => updatePref("showFullNames", v)}
          showDescription={prefs.showDescription}
          setShowDescription={(v) => updatePref("showDescription", v)}
          showBuildHistory={prefs.showBuildHistory}
          setShowBuildHistory={(v) => updatePref("showBuildHistory", v)}
          flattenGraph={prefs.flattenGraph}
          setFlattenGraph={(v) => updatePref("flattenGraph", v)}
          autoRefresh={prefs.autoRefresh}
          setAutoRefresh={(v) => updatePref("autoRefresh", v)}
        />
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <svg
            className="pgv-build-flow__svg"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Build flow graph with ${data.nodes.length} builds`}
          >
            {!prefs.flattenGraph &&
              data.edges.map((edge) => {
                const from = nodeById.get(edge.from);
                const to = nodeById.get(edge.to);
                if (!from || !to) return null;
                return (
                  <BuildFlowEdge
                    key={`${edge.from}->${edge.to}`}
                    from={from}
                    to={to}
                    sourceStatus={from.node.status}
                    direction={prefs.layoutDirection}
                    nodeWidth={nodeWidth}
                  />
                );
              })}
            {layoutNodes.map((ln) => (
              <BuildFlowNodeCard
                key={ln.node.id}
                layout={ln}
                rootUrl={rootUrl}
                nodeWidth={nodeWidth}
                showDuration={prefs.showDuration}
                showBuildNumber={prefs.showBuildNumber}
                showFullNames={prefs.showFullNames}
                showDescription={prefs.showDescription}
                showBuildHistory={prefs.showBuildHistory}
              />
            ))}
          </svg>
        </TransformComponent>
      </TransformWrapper>
      {data.isTruncated && (
        <span className="pgv-build-flow__truncated">
          {messages.format(LocalizedMessageKey.buildFlowTruncated, {
            0: "200",
          })}
        </span>
      )}
    </div>
  );
};
