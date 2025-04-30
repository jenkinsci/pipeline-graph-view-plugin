import "./stages.scss";

import { CSSProperties, useEffect, useState } from "react";
import {
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

export default function Stages({
  stages,
  selectedStage,
  stageViewPosition,
  onStageSelect,
}: StagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sidebarHeight, setSidebarHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setSidebarHeight(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={classNames("pgv-stages-graph", {
        "pgv-stages-graph--left": stageViewPosition === StageViewPosition.LEFT,
        "pgv-stages-graph--dialog": isExpanded,
      })}
      style={{ "--additional-height": sidebarHeight + "px" } as CSSProperties}
    >
      <div className={"pgv-stages-graph__controls pgv-stages-graph__heading"}>
        Graph
      </div>
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
        minScale={0.75}
        maxScale={3}
        wheel={{ activationKeys: isExpanded ? [] : ["Control"] }}
      >
        <ZoomControls />

        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <PipelineGraph
            stages={stages}
            selectedStage={selectedStage}
            {...(onStageSelect && {
              onStageSelect: (e) => {
                onStageSelect(e);
                setIsExpanded(false);
              },
            })}
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
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [buttonState, setButtonState] = useState({
    zoomIn: false,
    zoomOut: false,
    reset: true,
  });

  useTransformEffect(({ state, instance }) => {
    const cantZoomIn = state.scale >= instance.props.maxScale!;
    const cantZoomOut = state.scale <= instance.props.minScale!;
    const cantReset = state.scale === 1;

    setButtonState({
      zoomIn: cantZoomIn,
      zoomOut: cantZoomOut,
      reset: cantReset,
    });
  });

  return (
    <div className="pgv-stages-graph__controls pgw-zoom-controls">
      <Tooltip content={"Zoom in"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomIn()}
          disabled={buttonState.zoomIn}
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
          disabled={buttonState.zoomOut}
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
          onClick={() => resetTransform()}
          disabled={buttonState.reset}
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
