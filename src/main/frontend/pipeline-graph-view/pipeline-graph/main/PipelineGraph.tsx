import React, { useEffect, useState } from "react";

import useRunPoller from "../../../common/tree-api.ts";
import { layoutGraph } from "./PipelineGraphLayout.ts";
import {
  CompositeConnection,
  defaultLayout,
  LayoutInfo,
  NodeColumn,
  NodeLabelInfo,
  Result,
  StageInfo,
} from "./PipelineGraphModel.tsx";
import { GraphConnections } from "./support/connections.tsx";
import {
  BigLabel,
  SequentialContainerLabel,
  SmallLabel,
} from "./support/labels.tsx";
import { Node, SelectionHighlight } from "./support/nodes.tsx";

export function PipelineGraph(props: Props) {
  const {
    stages = [],
    layout,
    setStages,
    selectedStage,
    currentRunPath,
    previousRunPath,
    collapsed,
  } = props;

  const { run } = useRunPoller({
    currentRunPath,
    previousRunPath,
  });

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
    if (run) {
      updateLayout(run.stages);

      if (setStages) {
        setStages(run.stages);
      }
    }
  }, [run]);

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
    <div className="PWGx-PipelineGraph-container">
      <div style={outerDivStyle} className="PWGx-PipelineGraph">
        <svg width={measuredWidth} height={measuredHeight}>
          <GraphConnections connections={connections} layout={layoutState} />

          <SelectionHighlight
            layout={layoutState}
            nodeColumns={nodeColumns}
            isStageSelected={stageIsSelected}
          />
        </svg>

        {nodes.map((node) => (
          <Node key={node.id} node={node} collapsed={collapsed} />
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
  );
}

interface Props {
  stages: Array<StageInfo>;
  layout?: Partial<LayoutInfo>;
  setStages?: (stages: Array<StageInfo>) => void;
  selectedStage?: StageInfo;
  /**
   * Path of the current run
   */
  currentRunPath: string;
  /**
   * Optional path of the previous run
   */
  previousRunPath?: string;
  collapsed?: boolean;
}
