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
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import Tooltip from "../../../common/components/tooltip.tsx";
import {
  LocalizedMessageKey,
  useMessages,
} from "../../../common/i18n/index.ts";
import { BuildFlowResponseModel } from "../model/BuildFlowModel.ts";
import {
  OverflowMenu,
  PrimaryToggleControls,
  ZoomControls,
} from "./BuildFlowControls.tsx";
import { BuildFlowEdge } from "./BuildFlowEdge.tsx";
import { IconChevronRight, IconClose, IconExpand } from "./BuildFlowIcons.tsx";
import {
  computeFlatLayout,
  computeLayout,
  computeNodeWidth,
  NODE_WIDTH_MIN,
} from "./BuildFlowLayout.ts";
import { BuildFlowNodeCard } from "./BuildFlowNodeCard.tsx";
import {
  type BuildFlowPreferences,
  loadPreferences,
  savePreferences,
} from "./BuildFlowPreferences.ts";
import {
  computeFullPath,
  computeHighlightedIds,
  getBaseUrl,
  getRootUrl,
  isFullPageContext,
  shouldShowHeading,
} from "./BuildFlowUtils.ts";

// --- Component-specific constants ---
const MAX_SCALE = 3;
const CONTROLS_OVERHEAD = 80; // px reserved for zoom/toggle overlays
const MIN_CONTAINER_HEIGHT = 150;
const MAX_CONTAINER_HEIGHT = 350;

// --- Main Component ---

export interface BuildFlowProps {
  /** Override the build URL (e.g. "job/foo/42/"). Falls back to DOM element data attribute. */
  buildUrl?: string;
  /** Override the Jenkins root URL (e.g. "/jenkins"). Falls back to DOM element data attribute. */
  rootUrlOverride?: string;
  /** Called when the graph layout is computed, reporting the ideal container height in px. */
  onNaturalHeight?: (height: number) => void;
}

export const BuildFlow: FunctionComponent<BuildFlowProps> = ({
  buildUrl,
  rootUrlOverride,
  onNaturalHeight,
}) => {
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
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Load persisted preferences
  const [preferences, setPreferences] =
    useState<BuildFlowPreferences>(loadPreferences);

  const updatePreference = useCallback(
    <K extends keyof BuildFlowPreferences>(
      key: K,
      value: BuildFlowPreferences[K],
    ) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        savePreferences(next);
        return next;
      });
    },
    [],
  );

  const baseUrl = buildUrl || getBaseUrl();
  const rootUrl = rootUrlOverride || getRootUrl();
  const showHeading = shouldShowHeading();

  const nodeWidth = useMemo(() => {
    if (!data || data.nodes.length === 0) return NODE_WIDTH_MIN;
    return computeNodeWidth(data.nodes, preferences.showFullNames);
  }, [data, preferences.showFullNames]);

  const fetchData = useCallback(async () => {
    if (!baseUrl) {
      setError("No build URL configured");
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (!preferences.showUpstream) params.set("showUpstream", "false");
      if (!preferences.showDownstream) params.set("showDownstream", "false");
      const queryString = params.toString();
      const url = `${rootUrl}/${baseUrl}build-flow/api${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json.data as BuildFlowResponseModel);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, rootUrl, preferences.showUpstream, preferences.showDownstream]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (preferences.autoRefresh && data?.isAnyBuildOngoing) {
      timerRef.current = setInterval(fetchData, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [preferences.autoRefresh, data?.isAnyBuildOngoing, fetchData]);

  const layout = useMemo(() => {
    if (!data || data.nodes.length === 0) return null;
    if (preferences.flattenGraph)
      return computeFlatLayout(data.nodes, nodeWidth);
    return computeLayout(
      data.nodes,
      data.edges,
      preferences.layoutDirection,
      nodeWidth,
    );
  }, [data, preferences.layoutDirection, preferences.flattenGraph, nodeWidth]);

  // Compute initialScale: fit SVG into container minus overlay padding
  const svgWidth = layout?.width ?? 0;
  const svgHeight = layout?.height ?? 0;

  // Report natural height to parent for auto-sizing the pane
  useEffect(() => {
    if (onNaturalHeight && svgHeight > 0) {
      onNaturalHeight(Math.min(svgHeight + CONTROLS_OVERHEAD, 500));
    }
  }, [svgHeight, onNaturalHeight]);

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
    if (!preferences.focusCurrentFlow || preferences.flattenGraph || !data)
      return null;
    const currentNode = data.nodes.find((n) => n.isCurrentBuild);
    if (!currentNode) return null;
    return computeFullPath(currentNode.id, data.edges);
  }, [preferences.focusCurrentFlow, preferences.flattenGraph, data]);

  // Focus path: compute highlighted node set from hovered node
  const highlightedIds = useMemo(
    () =>
      data
        ? computeHighlightedIds(
            hoveredNodeId,
            data.edges,
            preferences.flattenGraph,
          )
        : null,
    [hoveredNodeId, data, preferences.flattenGraph],
  );

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

  // Dynamic height for job page: grow from small to max based on graph size.
  // Skip when embedded via props (Stages tab) - parent controls height.
  const isJobPageContext =
    !buildUrl && !isFullPage && !showHeading && !isExpanded;
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
          <Tooltip
            content={messages.format(
              isExpanded
                ? LocalizedMessageKey.buildFlowClose
                : LocalizedMessageKey.buildFlowExpand,
            )}
          >
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
          aria-label={messages.format(
            LocalizedMessageKey.buildFlowDisplayOptions,
          )}
        >
          <div className="pgv-build-flow__controls-left">
            <PrimaryToggleControls
              showUpstream={preferences.showUpstream}
              setShowUpstream={(v) => updatePreference("showUpstream", v)}
              showDownstream={preferences.showDownstream}
              setShowDownstream={(v) => updatePreference("showDownstream", v)}
              showBuildHistory={preferences.showBuildHistory}
              setShowBuildHistory={(v) =>
                updatePreference("showBuildHistory", v)
              }
              autoRefresh={preferences.autoRefresh}
              setAutoRefresh={(v) => updatePreference("autoRefresh", v)}
              focusCurrentFlow={preferences.focusCurrentFlow}
              setFocusCurrentFlow={(v) =>
                updatePreference("focusCurrentFlow", v)
              }
            />
            <OverflowMenu
              layoutDirection={preferences.layoutDirection}
              setLayoutDirection={(v) => updatePreference("layoutDirection", v)}
              showDuration={preferences.showDuration}
              setShowDuration={(v) => updatePreference("showDuration", v)}
              showBuildNumber={preferences.showBuildNumber}
              setShowBuildNumber={(v) => updatePreference("showBuildNumber", v)}
              showFullNames={preferences.showFullNames}
              setShowFullNames={(v) => updatePreference("showFullNames", v)}
              showDescription={preferences.showDescription}
              setShowDescription={(v) => updatePreference("showDescription", v)}
              flattenGraph={preferences.flattenGraph}
              setFlattenGraph={(v) => updatePreference("flattenGraph", v)}
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
            aria-label={messages.format(
              LocalizedMessageKey.buildFlowGraphLabel,
              { 0: data.nodes.length },
            )}
          >
            {!preferences.flattenGraph &&
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
                    direction={preferences.layoutDirection}
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
                showDuration={preferences.showDuration}
                showBuildNumber={preferences.showBuildNumber}
                showFullNames={preferences.showFullNames}
                showDescription={preferences.showDescription}
                showBuildHistory={preferences.showBuildHistory}
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
