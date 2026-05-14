import {
  CSSProperties,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Context as TransformContext } from "react-zoom-pan-pinch";

import { I18NContext } from "../../../common/i18n/index.ts";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";
import { nestedGraphLayout } from "./NestedPipelineGraphLayout.ts";
import {
  DEFAULT_MAX_COLUMNS_WHEN_COLLAPSED,
  layoutGraph,
} from "./PipelineGraphLayout";
import {
  debugPipelineGraph,
  defaultLayout,
  LayoutInfo,
  nestedLayout,
  StageInfo,
} from "./PipelineGraphModel.tsx";
import { GraphConnections } from "./support/connections.tsx";
import { DebugOutline } from "./support/DebugOutline.tsx";
import {
  BigLabel,
  SequentialContainerLabel,
  SmallLabel,
  TimingsLabel,
} from "./support/labels.tsx";
import { Node, SelectionHighlight } from "./support/nodes.tsx";

interface Viewport {
  x: number;
  y: number;
  w: number;
  h: number;
}

const VIEWPORT_MARGIN = 300;

const MIN_COLUMNS_WHEN_COLLAPSED = 5;

export function PipelineGraph({
  stages = [],
  layout,
  selectedStage,
  collapsed,
  onStageSelect,
  setMinScale,
  setInitialScale,
}: Props) {
  const fullLayout = useMemo(() => {
    return {
      ...defaultLayout,
      ...layout,
    };
  }, [layout]);
  const { showNames, showDurations } = useUserPreferences();

  const messages = useContext(I18NContext);

  const containerRef = useRef<HTMLDivElement>(null);
  const [maxColumnsWhenCollapsed, setMaxColumnsWhenCollapsed] =
    useState<number>(DEFAULT_MAX_COLUMNS_WHEN_COLLAPSED);

  useLayoutEffect(() => {
    if (!collapsed) return;
    const node = containerRef.current;
    if (!node) return;

    const apply = (width: number) => {
      if (width <= 0) return;
      const reservedSpace =
        fullLayout.nodeSpacingH / 2 + // before start
        fullLayout.nodeSpacingH * 0.7 + // start node with reduced spacing
        -fullLayout.nodeSpacingH * 0.3 + // reduced spacing to end node
        fullLayout.nodeSpacingH / 2; // after end;
      const next = Math.max(
        MIN_COLUMNS_WHEN_COLLAPSED,
        Math.floor((width - reservedSpace) / fullLayout.nodeSpacingH),
      );
      setMaxColumnsWhenCollapsed((prev) => (prev === next ? prev : next));
    };

    apply(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        apply(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [collapsed, fullLayout.nodeSpacingH]);

  const {
    nodes,
    allNodes,
    connections,
    bigLabels,
    timings,
    smallLabels,
    branchLabels,
    measuredWidth,
    measuredHeight,
  } = useMemo(() => {
    if (nestedLayout()) {
      return nestedGraphLayout(
        stages,
        fullLayout,
        collapsed ?? false,
        messages,
        showNames || !collapsed,
        showDurations,
        maxColumnsWhenCollapsed,
      );
    }
    return layoutGraph(
      stages,
      fullLayout,
      collapsed ?? false,
      messages,
      showNames,
      showDurations,
      maxColumnsWhenCollapsed,
    );
  }, [
    stages,
    fullLayout,
    collapsed,
    messages,
    showNames,
    showDurations,
    maxColumnsWhenCollapsed,
  ]);

  const stageIsSelected = useCallback(
    (stage?: StageInfo): boolean => {
      return (selectedStage && stage && selectedStage.id === stage.id) || false;
    },
    [selectedStage],
  );

  const transform = useContext(TransformContext);
  const [transformWidth, setTransformWidth] = useState<number>(0);
  useEffect(() => {
    if (!transform?.wrapperComponent) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTransformWidth(entry.contentRect.width);
      }
    });
    observer.observe(transform.wrapperComponent);
    return () => observer.disconnect();
  }, [transform?.wrapperComponent]);

  const [fitToWidth, setFitToWidth] = useState(true);
  useEffect(() => {
    if (!setMinScale || !setInitialScale || !transform) return;
    const initialScale = Math.min(1, transformWidth / measuredWidth);
    const minScale = initialScale * 0.75;
    setMinScale(minScale);
    setInitialScale(initialScale);
    if (fitToWidth) {
      // Don't scale too small by default.
      const autoScale = Math.max(initialScale, 0.5);
      const centerOffset = Math.max(0, (transformWidth - measuredWidth) / 2);
      if (
        transform.state.scale !== autoScale ||
        transform.state.positionX !== centerOffset
      ) {
        transform.setState(autoScale, centerOffset, 0);
      }
      return transform.onChange(() => setFitToWidth(false));
    }
  }, [
    transform,
    transformWidth,
    fitToWidth,
    measuredWidth,
    setMinScale,
    setInitialScale,
  ]);

  // When inside a TransformWrapper, only mount the nodes/labels intersecting
  // the visible region. Mounting thousands of absolute-positioned divs forces
  // a synchronous layout flush that blocks the main thread for seconds.
  const virtualize = transform != null;
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const cachedViewport = useRef<Viewport | null>(null);

  useEffect(() => {
    if (!transform) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const wrapper = transform.wrapperComponent;
      if (!wrapper) return;
      const { positionX, positionY, scale } = transform.state;
      const next: Viewport = {
        x: -positionX / scale,
        y: -positionY / scale,
        w: wrapper.offsetWidth / scale,
        h: wrapper.offsetHeight / scale,
      };
      const prev = cachedViewport.current;
      if (
        prev &&
        Math.abs(prev.x - next.x) < 50 &&
        Math.abs(prev.y - next.y) < 50 &&
        Math.abs(prev.w - next.w) < 50 &&
        Math.abs(prev.h - next.h) < 50
      ) {
        return;
      }
      cachedViewport.current = next;
      setViewport(next);
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };
    schedule();
    const unsubChange = transform.onChange(schedule);
    const unsubInit = transform.wrapperComponent
      ? undefined
      : transform.onInit(() => schedule());
    const observer = new ResizeObserver(schedule);
    const observed = transform.wrapperComponent;
    if (observed) observer.observe(observed);
    const unsubInitObserve = transform.wrapperComponent
      ? undefined
      : transform.onInit((ctx) => {
          if (ctx.instance.wrapperComponent) {
            observer.observe(ctx.instance.wrapperComponent);
          }
        });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      unsubChange();
      unsubInit?.();
      unsubInitObserve?.();
      observer.disconnect();
    };
  }, [transform]);

  const isInViewport = useCallback(
    (x: number, y: number): boolean => {
      if (!virtualize) return true;
      if (!viewport) return false;
      return (
        x >= viewport.x - VIEWPORT_MARGIN &&
        x <= viewport.x + viewport.w + VIEWPORT_MARGIN &&
        y >= viewport.y - VIEWPORT_MARGIN &&
        y <= viewport.y + viewport.h + VIEWPORT_MARGIN
      );
    },
    [viewport, virtualize],
  );

  const selectedStageId = selectedStage?.id;
  const visibleNodes = useMemo(() => {
    const filtered = nodes.filter((n) => isInViewport(n.x, n.y));
    if (!virtualize || selectedStageId == null) return filtered;
    if (
      filtered.some((n) => !n.isPlaceholder && n.stage?.id === selectedStageId)
    ) {
      return filtered;
    }
    const sel = nodes.find(
      (n) => !n.isPlaceholder && n.stage?.id === selectedStageId,
    );
    return sel ? [...filtered, sel] : filtered;
  }, [nodes, isInViewport, virtualize, selectedStageId]);

  const visibleSmallLabels = useMemo(
    () => smallLabels.filter((l) => isInViewport(l.x, l.y)),
    [smallLabels, isInViewport],
  );

  const visibleBranchLabels = useMemo(
    () => branchLabels.filter((l) => isInViewport(l.x, l.y)),
    [branchLabels, isInViewport],
  );

  const outerDivStyle: CSSProperties = {
    position: "relative",
    overflow: "visible",
  };
  if (debugPipelineGraph()) {
    outerDivStyle.border = "1px dashed red";
  }

  return (
    <div ref={containerRef} className="PWGx-PipelineGraph-container">
      <div style={outerDivStyle} className="PWGx-PipelineGraph">
        <svg width={measuredWidth} height={measuredHeight}>
          <GraphConnections connections={connections} layout={fullLayout} />

          <SelectionHighlight
            layout={fullLayout}
            nodes={nodes}
            isStageSelected={stageIsSelected}
          />

          {debugPipelineGraph() &&
            allNodes.map((node) => (
              <DebugOutline node={node} layout={fullLayout} key={node.id} />
            ))}
        </svg>

        {visibleNodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            collapsed={collapsed}
            isSelected={
              node.isPlaceholder ? false : selectedStage?.id === node.stage.id
            }
            onStageSelect={onStageSelect}
          />
        ))}

        {bigLabels.map((label) => (
          <BigLabel
            key={label.key}
            details={label}
            layout={fullLayout}
            measuredHeight={measuredHeight}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {timings.map((label) => (
          <TimingsLabel
            key={label.key}
            details={label}
            layout={fullLayout}
            measuredHeight={measuredHeight}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {visibleSmallLabels.map((label) => (
          <SmallLabel
            key={label.key}
            details={label}
            layout={fullLayout}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {visibleBranchLabels.map((label) => (
          <SequentialContainerLabel
            key={label.key}
            details={label}
            layout={fullLayout}
          />
        ))}
      </div>
    </div>
  );
}

interface Props {
  stages: Array<StageInfo>;
  layout?: Partial<LayoutInfo>;
  selectedStage?: StageInfo;
  collapsed?: boolean;
  onStageSelect?: (nodeId: string) => void;
  setMinScale?: (value: number) => void;
  setInitialScale?: (value: number) => void;
}
