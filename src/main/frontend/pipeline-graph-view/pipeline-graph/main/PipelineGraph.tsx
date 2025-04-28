import React, { useEffect, useState } from "react";

import {
  CompositeConnection,
  defaultLayout,
  NodeLabelInfo,
  LayoutInfo,
  NodeColumn,
  StageInfo, Result 
} from "./PipelineGraphModel.tsx";
import { layoutGraph } from "./PipelineGraphLayout";
import { Node, SelectionHighlight } from "./support/nodes.tsx";
import {
  BigLabel,
  SmallLabel,
  SequentialContainerLabel,
} from "./support/labels.tsx";
import { GraphConnections } from "./support/connections.tsx";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import Tooltip from "../../../common/components/tooltip.tsx";

export function PipelineGraph(props: Props) {
  const { stages = [], layout, selectedStage, collapsed } = props;

  const [nodeColumns, setNodeColumns] = useState<NodeColumn[]>([]);
  const [connections, setConnections] = useState<CompositeConnection[]>([]);
  const [bigLabels, setBigLabels] = useState<NodeLabelInfo[]>([]);
  const [smallLabels, setSmallLabels] = useState<NodeLabelInfo[]>([]);
  const [branchLabels, setBranchLabels] = useState<NodeLabelInfo[]>([]);
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const [layoutState, setLayoutState] = useState<LayoutInfo>({
    ...defaultLayout,
    ...layout,
  });
  const [currentSelectedStage, setCurrentSelectedStage] = useState<
    StageInfo | undefined
  >(selectedStage);

  useEffect(() => {
    updateLayout(stages);
  }, [stages]);

  useEffect(() => {
    let needsLayout = false;
    let newLayoutState = layoutState;

    if (layout !== props.layout) {
      newLayoutState = { ...defaultLayout, ...layout };
      setLayoutState(newLayoutState);
      needsLayout = true;
    }

    if (selectedStage !== currentSelectedStage) {
      setCurrentSelectedStage(selectedStage);
    }

    if (stages !== props.stages) {
      needsLayout = true;
    }

    if (needsLayout) {
      updateLayout(stages);
    }
  }, [layout, selectedStage, stages]);

  const updateLayout = (newStages: StageInfo[] = []) => {
    const newLayout = layoutGraph(newStages, layoutState, collapsed ?? false);
    setNodeColumns(newLayout.nodeColumns);
    setConnections(newLayout.connections);
    setBigLabels(newLayout.bigLabels);
    setSmallLabels(newLayout.smallLabels);
    setBranchLabels(newLayout.branchLabels);
    setMeasuredWidth(newLayout.measuredWidth);
    setMeasuredHeight(newLayout.measuredHeight);
  };

  const stageIsSelected = (stage?: StageInfo): boolean => {
    return (
      (currentSelectedStage && stage && currentSelectedStage.id === stage.id) ||
      false
    );
  };

  const nodes = nodeColumns.flatMap((column) => {
    const topStageState = column.topStage?.state ?? Result.unknown;

    return column.rows.flatMap((row) =>
      row.map((node) => {
        if (
          column.topStage &&
          "stage" in node &&
          node.stage &&
          Array.isArray(column.topStage.children) &&
          column.topStage.children.includes(node.stage) &&
          collapsed
        ) {
          node.stage.state = topStageState;
        }

        return node;
      }),
    );
  });

  const outerDivStyle = {
    position: "relative" as const,
    overflow: "visible" as const,
  };

  return (
    <TransformWrapper>
      <ZoomControls />

      <TransformComponent wrapperStyle={{ width: "unset" }}>
        <div className="PWGx-PipelineGraph-container">
          <div style={outerDivStyle} className="PWGx-PipelineGraph">
            <svg width={measuredWidth} height={measuredHeight}>
              <GraphConnections
                connections={connections}
                layout={layoutState}
              />

              <SelectionHighlight
                layout={layoutState}
                nodeColumns={nodeColumns}
                isStageSelected={stageIsSelected}
              />
            </svg>

            {nodes.map((node) => (
              <Node
                key={node.id}
                node={node}
                collapsed={collapsed}
                handleStageSelect={props.handleStageSelect}
              />
            ))}

            {bigLabels.map((label) => (
              <BigLabel
                key={label.key}
                details={label}
                layout={layoutState}
                measuredHeight={measuredHeight}
                selectedStage={currentSelectedStage}
                isStageSelected={stageIsSelected}
              />
            ))}

            {smallLabels.map((label) => (
              <SmallLabel
                key={label.key}
                details={label}
                layout={layoutState}
                isStageSelected={stageIsSelected}
              />
            ))}

            {branchLabels.map((label) => (
              <SequentialContainerLabel
                key={label.key}
                details={label}
                layout={layoutState}
              />
            ))}
          </div>
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="pgw-zoom-controls">
      <Tooltip content={"Zoom in"}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomIn()}
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

interface Props {
  stages: Array<StageInfo>;
  layout?: Partial<LayoutInfo>;
  setStages?: (stages: Array<StageInfo>) => void;
  selectedStage?: StageInfo;
  collapsed?: boolean;
  handleStageSelect: (nodeId: string) => void;
}
