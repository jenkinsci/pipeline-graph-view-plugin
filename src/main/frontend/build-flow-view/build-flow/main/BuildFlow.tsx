import "./BuildFlow.scss";

import Tippy from "@tippyjs/react";
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

import { DefaultDropdownProps } from "../../../common/components/dropdown.tsx";
import StatusIcon from "../../../common/components/status-icon.tsx";
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
  IconBarChart,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconClose,
  IconDocumentText,
  IconEllipsisVertical,
  IconExpand,
  IconFitToView,
  IconGitMerge,
  IconGrid,
  IconLocate,
  IconMinus,
  IconPlus,
  IconPricetag,
  IconRefreshCircle,
  IconSwapHorizontal,
  IconTime,
  IconTrailSign,
  ToggleButton,
} from "./BuildFlowIcons.tsx";
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
} from "./BuildFlowLayout.ts";
import {
  computeFullPath,
  getBaseUrl,
  getRootUrl,
  isFullPageContext,
  resultDotColor,
  shouldShowHeading,
  statusClass,
  statusColor,
  toResult,
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
  focusCurrentFlow: boolean;
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
  focusCurrentFlow: false,
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
  index: number;
  isFirstMount: boolean;
  isDimmed: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({
  layout,
  rootUrl,
  nodeWidth,
  showDuration,
  showBuildNumber,
  showFullNames,
  showDescription,
  showBuildHistory,
  index,
  isFirstMount,
  isDimmed,
  onMouseEnter,
  onMouseLeave,
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
  const ariaLabel = `${node.jobName} #${node.buildNumber} - ${formatStatus(node.status)}`;

  return (
    <foreignObject
      x={x}
      y={y}
      width={nodeWidth}
      height={NODE_HEIGHT}
      style={{
        opacity: isDimmed ? 0.25 : 1,
        transition: "opacity var(--standard-transition, 0.2s)",
        pointerEvents: isDimmed ? "none" : undefined,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <a
        className={classes}
        href={href}
        title={node.displayName}
        aria-label={ariaLabel}
        style={
          isFirstMount
            ? { animationDelay: `${Math.min(index * 30, 500)}ms` }
            : undefined
        }
      >
        <div className="pgv-build-flow__node-header">
          <StatusIcon status={toResult(node.status)} />
          <span className="pgv-build-flow__node-name">{name}</span>
          {showBuildNumber && (
            <span className="pgv-build-flow__node-build-num">
              #{node.buildNumber}
            </span>
          )}
        </div>
        <span className="pgv-build-flow__node-meta">
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
  isDimmed: boolean;
  isFirstMount: boolean;
  index: number;
}> = ({
  from,
  to,
  sourceStatus,
  direction,
  nodeWidth,
  isDimmed,
  isFirstMount,
  index,
}) => {
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
    <g
      className={edgeClass}
      aria-hidden="true"
      style={{
        opacity: isDimmed ? 0.15 : undefined,
        transition: "opacity var(--standard-transition, 0.2s)",
        ...(isFirstMount
          ? { animationDelay: `${Math.min(index * 30 + 150, 600)}ms` }
          : {}),
      }}
    >
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
          {IconPlus}
        </button>
      </Tooltip>
      <Tooltip content={"Zoom out"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomOut()}
          disabled={scale <= minScale}
        >
          {IconMinus}
        </button>
      </Tooltip>
      <Tooltip content={"Fit to view"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => centerView(initialScale)}
          disabled={!isTransformed}
        >
          {IconFitToView}
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
  focusCurrentFlow: boolean;
  setFocusCurrentFlow: (v: boolean) => void;
}

/** Primary toggles: always visible in left group */
const PrimaryToggleControls: FunctionComponent<
  Pick<
    ToggleControlsProps,
    | "showUpstream"
    | "setShowUpstream"
    | "showDownstream"
    | "setShowDownstream"
    | "showBuildHistory"
    | "setShowBuildHistory"
    | "autoRefresh"
    | "setAutoRefresh"
    | "focusCurrentFlow"
    | "setFocusCurrentFlow"
  >
> = ({
  showUpstream,
  setShowUpstream,
  showDownstream,
  setShowDownstream,
  showBuildHistory,
  setShowBuildHistory,
  autoRefresh,
  setAutoRefresh,
  focusCurrentFlow,
  setFocusCurrentFlow,
}) => {
  return (
    <>
      <ToggleButton
        icon={IconChevronUp}
        label=""
        active={showUpstream}
        onToggle={() => setShowUpstream(!showUpstream)}
        tooltip={showUpstream ? "Hide upstream" : "Show upstream"}
      />
      <ToggleButton
        icon={IconChevronDown}
        label=""
        active={showDownstream}
        onToggle={() => setShowDownstream(!showDownstream)}
        tooltip={showDownstream ? "Hide downstream" : "Show downstream"}
      />
      <ToggleButton
        icon={IconLocate}
        label=""
        active={focusCurrentFlow}
        onToggle={() => setFocusCurrentFlow(!focusCurrentFlow)}
        tooltip={
          focusCurrentFlow ? "Show full graph" : "Focus current build's flow"
        }
      />
      <ToggleButton
        icon={IconBarChart}
        label=""
        active={showBuildHistory}
        onToggle={() => setShowBuildHistory(!showBuildHistory)}
        tooltip={showBuildHistory ? "Hide build history" : "Show build history"}
      />
      <ToggleButton
        icon={IconRefreshCircle}
        label=""
        active={autoRefresh}
        onToggle={() => setAutoRefresh(!autoRefresh)}
        tooltip={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
      />
    </>
  );
};

/** Secondary toggles: behind overflow menu */
const OverflowMenu: FunctionComponent<
  Pick<
    ToggleControlsProps,
    | "layoutDirection"
    | "setLayoutDirection"
    | "showDuration"
    | "setShowDuration"
    | "showBuildNumber"
    | "setShowBuildNumber"
    | "showFullNames"
    | "setShowFullNames"
    | "showDescription"
    | "setShowDescription"
    | "flattenGraph"
    | "setFlattenGraph"
  >
> = ({
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
  flattenGraph,
  setFlattenGraph,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Tippy
      visible={menuOpen}
      onClickOutside={() => setMenuOpen(false)}
      {...DefaultDropdownProps}
      placement="auto-start"
      content={
        <div
          className="pgv-build-flow__overflow-menu"
          role="menu"
          aria-label="Additional display options"
        >
          <ToggleButton
            icon={IconTime}
            label="Show duration"
            active={showDuration}
            onToggle={() => setShowDuration(!showDuration)}
          />
          <ToggleButton
            icon={IconPricetag}
            label="Show build number"
            active={showBuildNumber}
            onToggle={() => setShowBuildNumber(!showBuildNumber)}
          />
          <ToggleButton
            icon={IconTrailSign}
            label="Show full names"
            active={showFullNames}
            onToggle={() => setShowFullNames(!showFullNames)}
          />
          <ToggleButton
            icon={IconDocumentText}
            label="Show description"
            active={showDescription}
            onToggle={() => setShowDescription(!showDescription)}
          />
          <button
            className="jenkins-button jenkins-button--tertiary"
            onClick={() =>
              setLayoutDirection(layoutDirection === "LTR" ? "TTB" : "LTR")
            }
            role="menuitem"
          >
            <span
              style={{
                display: "contents",
                transform:
                  layoutDirection === "TTB" ? "rotate(90deg)" : undefined,
              }}
            >
              {IconSwapHorizontal}
            </span>
            {layoutDirection === "LTR" ? "Top-to-bottom" : "Left-to-right"}
          </button>
          <ToggleButton
            icon={flattenGraph ? IconGitMerge : IconGrid}
            label={flattenGraph ? "Show graph" : "Flatten to grid"}
            active={flattenGraph}
            onToggle={() => setFlattenGraph(!flattenGraph)}
          />
        </div>
      }
    >
      <button
        className="jenkins-button jenkins-button--tertiary"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="More options"
        aria-expanded={menuOpen}
      >
        {IconEllipsisVertical}
      </button>
    </Tippy>
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
  const isFirstMountRef = useRef(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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
    if (!containerWidth || !containerHeight || !svgWidth || !svgHeight) {
      return 1;
    }
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
    const timer = setTimeout(() => {
      ref.centerView(scale);
      isFirstMountRef.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [containerWidth, containerHeight, svgWidth, svgHeight, initialScale]);

  // Focus current flow: full transitive path through the current build
  const focusedPathIds = useMemo(() => {
    if (!prefs.focusCurrentFlow || prefs.flattenGraph || !data) return null;
    const currentNode = data.nodes.find((n) => n.isCurrentBuild);
    if (!currentNode) return null;
    return computeFullPath(currentNode.id, data.edges);
  }, [prefs.focusCurrentFlow, prefs.flattenGraph, data]);

  // Focus path: compute highlighted node set from hovered node
  const highlightedIds = useMemo(() => {
    if (!hoveredNodeId || prefs.flattenGraph || !data) return null;
    const set = new Set<string>([hoveredNodeId]);
    for (const edge of data.edges) {
      if (edge.from === hoveredNodeId) set.add(edge.to);
      if (edge.to === hoveredNodeId) set.add(edge.from);
    }
    return set;
  }, [hoveredNodeId, data, prefs.flattenGraph]);

  // Clear hovered node when data changes (auto-refresh)
  useEffect(() => {
    setHoveredNodeId(null);
  }, [data]);

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
  const activeSet = highlightedIds ?? focusedPathIds;

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
          {IconChevronRight}
        </a>
      )}
      {(showHeading || isExpanded) && (
        <div className="pgv-build-flow__controls pgw-fullscreen-controls">
          <Tooltip content={isExpanded ? "Close" : "Expand"}>
            <button
              className={"jenkins-button jenkins-button--tertiary"}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? IconClose : IconExpand}
            </button>
          </Tooltip>
        </div>
      )}
      <TransformWrapper
        initialScale={initialScale}
        minScale={minScale}
        maxScale={MAX_SCALE}
        centerOnInit
        wheel={{ activationKeys: isExpanded ? [] : ["Control"] }}
        ref={transformRef}
      >
        <ZoomControls initialScale={initialScale} minScale={minScale} />
        <div
          className="pgv-build-flow__controls pgv-build-flow__controls-bar"
          role="toolbar"
          aria-label="Build flow display options"
        >
          <div className="pgv-build-flow__controls-left">
            <PrimaryToggleControls
              showUpstream={prefs.showUpstream}
              setShowUpstream={(v) => updatePref("showUpstream", v)}
              showDownstream={prefs.showDownstream}
              setShowDownstream={(v) => updatePref("showDownstream", v)}
              showBuildHistory={prefs.showBuildHistory}
              setShowBuildHistory={(v) => updatePref("showBuildHistory", v)}
              autoRefresh={prefs.autoRefresh}
              setAutoRefresh={(v) => updatePref("autoRefresh", v)}
              focusCurrentFlow={prefs.focusCurrentFlow}
              setFocusCurrentFlow={(v) => updatePref("focusCurrentFlow", v)}
            />
            <OverflowMenu
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
              flattenGraph={prefs.flattenGraph}
              setFlattenGraph={(v) => updatePref("flattenGraph", v)}
            />
          </div>
        </div>
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
              data.edges.map((edge, i) => {
                const from = nodeById.get(edge.from);
                const to = nodeById.get(edge.to);
                if (!from || !to) return null;
                const edgeDimmed =
                  activeSet != null &&
                  !(activeSet.has(edge.from) && activeSet.has(edge.to));
                return (
                  <BuildFlowEdge
                    key={`${edge.from}->${edge.to}`}
                    from={from}
                    to={to}
                    sourceStatus={from.node.status}
                    direction={prefs.layoutDirection}
                    nodeWidth={nodeWidth}
                    isDimmed={edgeDimmed}
                    isFirstMount={isFirstMountRef.current}
                    index={i}
                  />
                );
              })}
            {layoutNodes.map((ln, i) => (
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
                index={i}
                isFirstMount={isFirstMountRef.current}
                isDimmed={activeSet != null && !activeSet.has(ln.node.id)}
                onMouseEnter={() => setHoveredNodeId(ln.node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
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
