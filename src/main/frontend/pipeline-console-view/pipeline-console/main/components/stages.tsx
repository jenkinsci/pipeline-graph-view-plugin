import "./stages.scss";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  ReactZoomPanPinchContextState,
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";

import { COLLAPSE, EXPAND } from "../../../../common/components/symbols.tsx";
import Tooltip from "../../../../common/components/tooltip.tsx";
import {
  I18NContext,
  LocalizedMessageKey,
} from "../../../../common/i18n/index.ts";
import { classNames } from "../../../../common/utils/classnames.ts";
import { PipelineGraph } from "../../../../pipeline-graph-view/pipeline-graph/main/PipelineGraph.tsx";
import {
  LayoutInfo,
  StageInfo,
} from "../../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { useCollapsedStages } from "../../../../pipeline-graph-view/pipeline-graph/main/support/useCollapsedStages.ts";
import { StageViewPosition } from "../providers/user-preference-provider.tsx";

const MAX_SCALE = 3;
const SCALE_TOLERANCE = 0.001;
const POSITION_TOLERANCE = 1;

interface GraphTransform {
  scale: number;
  positionX: number;
  positionY: number;
}

export default function Stages({
  layout,
  stages,
  selectedStage,
  stageViewPosition,
  onStageSelect,
  onRunPage,
  normalizedParentJobPath,
  setAutoStageViewHeight,
  setDefaultStageViewHeight,
  currentRunPath,
}: StagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    collapsedStageIds,
    toggleCollapseStage,
    collapseAll,
    expandAll,
    hasCollapsibleStages,
    effectiveStages,
  } = useCollapsedStages(normalizedParentJobPath, stages, selectedStage?.id);

  const handleStageSelect = useCallback(
    (nodeId: string) => {
      onStageSelect?.(nodeId);
      setIsExpanded(false);
    },
    [onStageSelect],
  );

  const [centerGraph, setCenterGraph] = useState(true);
  const [initialScale, setInitialScale] = useState(1);
  const [minScale, setMinScale] = useState(0.75);
  const [defaultTransform, setDefaultTransform] = useState<GraphTransform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });

  return (
    <div
      className={classNames("pgv-stages-graph", {
        "pgv-stages-graph--left": stageViewPosition === StageViewPosition.LEFT,
        "pgv-stages-graph--dialog": isExpanded,
        "jenkins-card": !onRunPage,
      })}
    >
      {onRunPage && (
        <a
          className={"pgv-stages-graph__controls pgv-stages-graph__heading"}
          href="stages"
        >
          Stages
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
      <div className={"pgv-stages-graph__controls pgw-fullscreen-controls"}>
        <Tooltip content={isExpanded ? "Close" : "Expand"}>
          <button
            className={"jenkins-button jenkins-button--tertiary"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded && (
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
            )}
            {!isExpanded && (
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
      <TransformWrapper
        initialScale={initialScale}
        minScale={minScale}
        maxScale={MAX_SCALE}
        wheel={{ activationKeys: isExpanded ? [] : ["Control"] }}
      >
        <ZoomControls
          defaultTransform={defaultTransform}
          minScale={minScale}
          collapsedStageIds={collapsedStageIds}
          hasCollapsibleStages={hasCollapsibleStages}
          onCollapseAll={collapseAll}
          onExpandAll={expandAll}
          setCenterGraph={setCenterGraph}
        />

        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <PipelineGraph
            layout={layout}
            stages={effectiveStages}
            selectedStage={selectedStage}
            currentRunPath={currentRunPath}
            collapsedStageIds={collapsedStageIds}
            onToggleCollapse={toggleCollapseStage}
            setInitialScale={setInitialScale}
            setMinScale={setMinScale}
            setDefaultTransform={setDefaultTransform}
            setAutoStageViewHeight={setAutoStageViewHeight}
            setDefaultStageViewHeight={setDefaultStageViewHeight}
            centerGraph={centerGraph}
            setCenterGraph={setCenterGraph}
            {...(onStageSelect && { onStageSelect: handleStageSelect })}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

interface StagesProps {
  layout: Partial<LayoutInfo>;
  stages: StageInfo[];
  selectedStage?: StageInfo;
  stageViewPosition: StageViewPosition;
  onStageSelect?: (nodeId: string) => void;
  onRunPage?: boolean;
  normalizedParentJobPath: string;
  setAutoStageViewHeight: Dispatch<SetStateAction<number>>;
  setDefaultStageViewHeight: Dispatch<SetStateAction<number>>;
  currentRunPath: string;
}

interface ZoomControlsProps {
  defaultTransform: GraphTransform;
  minScale: number;
  collapsedStageIds: Set<number>;
  hasCollapsibleStages: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  setCenterGraph: Dispatch<SetStateAction<boolean>>;
}

function ZoomControls({
  defaultTransform,
  minScale,
  collapsedStageIds,
  hasCollapsibleStages,
  onCollapseAll,
  onExpandAll,
  setCenterGraph,
}: ZoomControlsProps) {
  const { zoomIn, zoomOut } = useControls();
  const messages = useContext(I18NContext);
  const [transform, setTransformState] = useState(defaultTransform);
  const handleTransformEffect = useCallback(
    (ref: ReactZoomPanPinchContextState) =>
      setTransformState({
        scale: ref.state.scale,
        positionX: ref.state.positionX,
        positionY: ref.state.positionY,
      }),
    [],
  );
  useTransformEffect(handleTransformEffect);
  const isAtDefaultTransform =
    Math.abs(transform.scale - defaultTransform.scale) < SCALE_TOLERANCE &&
    Math.abs(transform.positionX - defaultTransform.positionX) <
      POSITION_TOLERANCE &&
    Math.abs(transform.positionY - defaultTransform.positionY) <
      POSITION_TOLERANCE;

  return (
    <div className="pgv-stages-graph__controls pgw-zoom-controls">
      <Tooltip content={"Zoom in"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomIn()}
          disabled={transform.scale >= MAX_SCALE}
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
          disabled={transform.scale <= minScale}
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
      <Tooltip content={"Reset"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => setCenterGraph(true)}
          disabled={isAtDefaultTransform}
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
      {hasCollapsibleStages && (
        <Tooltip
          content={
            collapsedStageIds.size > 0
              ? messages.format(LocalizedMessageKey.expandAllStages)
              : messages.format(LocalizedMessageKey.collapseAllStages)
          }
        >
          <button
            className={"jenkins-button jenkins-button--tertiary"}
            onClick={collapsedStageIds.size > 0 ? onExpandAll : onCollapseAll}
          >
            {collapsedStageIds.size > 0 ? EXPAND : COLLAPSE}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
