import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Context as TransformContext } from "react-zoom-pan-pinch";

import { I18NContext } from "../../../common/i18n/index.ts";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";
import { layoutGraph } from "./PipelineGraphLayout";
import { defaultLayout, LayoutInfo, StageInfo } from "./PipelineGraphModel.tsx";
import { GraphConnections } from "./support/connections.tsx";
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

export function PipelineGraph({
  stages = [],
  layout,
  selectedStage,
  collapsed,
  onStageSelect,
}: Props) {
  const fullLayout = useMemo(() => {
    return {
      ...defaultLayout,
      ...layout,
    };
  }, [layout]);
  const { showNames, showDurations } = useUserPreferences();

  const messages = useContext(I18NContext);

  const {
    nodeColumns,
    connections,
    bigLabels,
    timings,
    smallLabels,
    branchLabels,
    measuredWidth,
    measuredHeight,
  } = useMemo(
    () =>
      layoutGraph(
        stages,
        fullLayout,
        collapsed ?? false,
        messages,
        showNames,
        showDurations,
      ),
    [stages, fullLayout, collapsed, messages, showNames, showDurations],
  );

  const stageIsSelected = useCallback(
    (stage?: StageInfo): boolean => {
      return (selectedStage && stage && selectedStage.id === stage.id) || false;
    },
    [selectedStage],
  );

  const nodes = useMemo(
    () => nodeColumns.flatMap((column) => column.rows.flatMap((row) => row)),
    [nodeColumns],
  );

  // When inside a TransformWrapper, only mount the nodes/labels intersecting
  // the visible region. Mounting thousands of absolute-positioned divs forces
  // a synchronous layout flush that blocks the main thread for seconds.
  const transform = useContext(TransformContext);
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

  const outerDivStyle = {
    position: "relative" as const,
    overflow: "visible" as const,
  };

  return (
    <div className="PWGx-PipelineGraph-container">
      <div style={outerDivStyle} className="PWGx-PipelineGraph">
        <svg width={measuredWidth} height={measuredHeight}>
          <GraphConnections connections={connections} layout={fullLayout} />

          <SelectionHighlight
            layout={fullLayout}
            nodeColumns={nodeColumns}
            isStageSelected={stageIsSelected}
          />
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
}
