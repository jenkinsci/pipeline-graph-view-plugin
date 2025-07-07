import { useContext, useEffect, useState } from "react";

import { I18NContext } from "../../../common/i18n/index.ts";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";
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
  TimingsLabel,
} from "./support/labels.tsx";
import { Node, SelectionHighlight } from "./support/nodes.tsx";

export function PipelineGraph(props: Props) {
  const { stages = [], layout, selectedStage, collapsed } = props;

  const [nodeColumns, setNodeColumns] = useState<NodeColumn[]>([]);
  const [connections, setConnections] = useState<CompositeConnection[]>([]);
  const [bigLabels, setBigLabels] = useState<NodeLabelInfo[]>([]);
  const [timings, setTimings] = useState<NodeLabelInfo[]>([]);
  const [smallLabels, setSmallLabels] = useState<NodeLabelInfo[]>([]);
  const [branchLabels, setBranchLabels] = useState<NodeLabelInfo[]>([]);
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  function getLayout() {
    return {
      ...defaultLayout,
      ...layout,
    };
  }
  const [currentSelectedStage, setCurrentSelectedStage] = useState<
    StageInfo | undefined
  >(selectedStage);

  const { showNames, showDurations } = useUserPreferences();

  useEffect(() => {
    updateLayout(stages);
  }, [stages, layout, showNames, showDurations]);

  useEffect(() => {
    let needsLayout = false;

    if (selectedStage !== currentSelectedStage) {
      setCurrentSelectedStage(selectedStage);
    }

    if (stages !== props.stages) {
      needsLayout = true;
    }

    if (needsLayout) {
      updateLayout(stages);
    }
  }, [layout, selectedStage, stages, showNames, showDurations]);

  const messages = useContext(I18NContext);

  const updateLayout = (newStages: StageInfo[] = []) => {
    const newLayout = layoutGraph(
      newStages,
      getLayout(),
      collapsed ?? false,
      messages,
      showNames,
      showDurations,
    );
    setNodeColumns(newLayout.nodeColumns);
    setConnections(newLayout.connections);
    setBigLabels(newLayout.bigLabels);
    setSmallLabels(newLayout.smallLabels);
    setTimings(newLayout.timings);
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
          <GraphConnections connections={connections} layout={getLayout()} />

          <SelectionHighlight
            layout={getLayout()}
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
            layout={getLayout()}
            measuredHeight={measuredHeight}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {timings.map((label) => (
          <TimingsLabel
            key={label.key}
            details={label}
            layout={getLayout()}
            measuredHeight={measuredHeight}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {smallLabels.map((label) => (
          <SmallLabel
            key={label.key}
            details={label}
            layout={getLayout()}
            isSelected={selectedStage?.id === label.stage?.id}
          />
        ))}

        {branchLabels.map((label) => (
          <SequentialContainerLabel
            key={label.key}
            details={label}
            layout={getLayout()}
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
