import { useContext, useEffect, useState } from "react";

import { I18NContext } from "../../../common/i18n/index.ts";
import { layoutGraph } from "./PipelineGraphLayout";
import {
  CompositeConnection,
  defaultLayout,
  LayoutInfo,
  NodeColumn,
  NodeLabelInfo,
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

  const messages = useContext(I18NContext);

  const updateLayout = (newStages: StageInfo[] = []) => {
    const newLayout = layoutGraph(
      newStages,
      layoutState,
      collapsed ?? false,
      messages,
    );
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
    return column.rows.flatMap((row) => row);
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
          <Node
            key={node.id}
            node={node}
            collapsed={collapsed}
            isSelected={
              node.isPlaceholder ? false : selectedStage?.id === node.stage.id
            }
            onStageSelect={props.onStageSelect}
          />
        ))}

        {bigLabels.map((label) => (
          <BigLabel
            key={label.key}
            details={label}
            layout={layoutState}
            measuredHeight={measuredHeight}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {smallLabels.map((label) => (
          <SmallLabel
            key={label.key}
            details={label}
            layout={layoutState}
            isSelected={selectedStage?.id === label.stage?.id}
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
  selectedStage?: StageInfo;
  collapsed?: boolean;
  onStageSelect?: (nodeId: string) => void;
}
