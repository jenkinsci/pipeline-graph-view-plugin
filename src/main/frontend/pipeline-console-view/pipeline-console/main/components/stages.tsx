import "./stages.scss";

import { useCallback, useState } from "react";
import {
  ReactZoomPanPinchContextState,
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";

import Tooltip from "../../../../common/components/tooltip.tsx";
import { classNames } from "../../../../common/utils/classnames.ts";
import { PipelineGraph } from "../../../../pipeline-graph-view/pipeline-graph/main/PipelineGraph.tsx";
import { StageInfo } from "../../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { StageViewPosition } from "../providers/user-preference-provider.tsx";

const MAX_SCALE = 3;

export default function Stages({
  stages,
  selectedStage,
  stageViewPosition,
  onStageSelect,
  onRunPage,
}: StagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStageSelect = useCallback(
    (nodeId: string) => {
      onStageSelect?.(nodeId);
      setIsExpanded(false);
    },
    [onStageSelect],
  );

  const [initialScale, setInitialScale] = useState(1);
  const [minScale, setMinScale] = useState(0.75);

  return (
    <div
      className={classNames("pgv-stages-graph", {
        "pgv-stages-graph--left": stageViewPosition === StageViewPosition.LEFT,
        "pgv-stages-graph--dialog": isExpanded,
        "pvg-stages-graph--spacing-top": onRunPage,
        "pvg-stages-graph--spacing-right": !onRunPage && !isExpanded,
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
        <ZoomControls initialScale={initialScale} minScale={minScale} />

        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <PipelineGraph
            stages={stages}
            selectedStage={selectedStage}
            setInitialScale={setInitialScale}
            setMinScale={setMinScale}
            {...(onStageSelect && { onStageSelect: handleStageSelect })}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

interface StagesProps {
  stages: StageInfo[];
  selectedStage?: StageInfo;
  stageViewPosition: StageViewPosition;
  onStageSelect?: (nodeId: string) => void;
  onRunPage?: boolean;
}

interface ZoomControlsProps {
  initialScale: number;
  minScale: number;
}

function ZoomControls({ initialScale, minScale }: ZoomControlsProps) {
  const { zoomIn, zoomOut, centerView } = useControls();
  const [scale, setScale] = useState(initialScale);
  const handleTransformEffect = useCallback(
    (ref: ReactZoomPanPinchContextState) => setScale(ref.state.scale),
    [],
  );
  useTransformEffect(handleTransformEffect);

  return (
    <div className="pgv-stages-graph__controls pgw-zoom-controls">
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
      <Tooltip content={"Reset"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => centerView(initialScale)}
          disabled={scale === initialScale}
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
