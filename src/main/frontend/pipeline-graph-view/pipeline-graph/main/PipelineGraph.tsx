import React, { useEffect, useState } from "react";

import startPollingPipelineStatus from "./support/startPollingPipelineStatus";
import {
  CompositeConnection,
  defaultLayout,
  NodeLabelInfo,
  LayoutInfo,
  NodeColumn,
  StageInfo,
} from "./PipelineGraphModel";
import { layoutGraph } from "./PipelineGraphLayout";
import { Result } from "./PipelineGraphModel";
import { Node, SelectionHighlight } from "./support/nodes";
import {
  BigLabel,
  SmallLabel,
  SequentialContainerLabel,
} from "./support/labels";
import { GraphConnections } from "./support/connections";
import { getRunStatusFromPath } from "../../../common/RestClient";

export function PipelineGraph(props: Props) {
  const {
    stages = [],
    layout,
    setStages,
    selectedStage,
    path,
    previousPath,
    collapsed,
  } = props;

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
    console.log(previousPath);

    // TODO - tidy this up
    if (previousPath) {
      getRunStatusFromPath(previousPath).then(r => {
        updateLayout(markSkeleton(r!.stages))

        // poll stuff
        const onPipelineDataReceived = (data: { stages: StageInfo[] }) => {
          if (setStages) setStages(data.stages);

          updateLayout(mergeStageInfos(markSkeleton(r!.stages), data.stages));

          console.log("New", data.stages);
        };

        const onPollingError = (err: Error) => {
          console.log("There was an error when polling the pipeline status", err);
        };

        const onPipelineComplete = () => undefined;

        startPollingPipelineStatus(
          onPipelineDataReceived,
          onPollingError,
          onPipelineComplete,
          path ?? getTreePath(),
        );
      });
    } else {
    //   const onPipelineDataReceived = (data: { stages: StageInfo[] }) => {
    //     if (setStages) setStages(data.stages);
    //     updateLayout(data.stages);
    //   };
    //
    //   const onPollingError = (err: Error) => {
    //     console.log("There was an error when polling the pipeline status", err);
    //   };
    //
    //   const onPipelineComplete = () => undefined;
    //
    //   startPollingPipelineStatus(
    //     onPipelineDataReceived,
    //     onPollingError,
    //     onPipelineComplete,
    //     path ?? getTreePath(),
    //   );
    }
  }, []);

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

  const getTreePath = () => {
    const url = new URL(window.location.href);
    return url.pathname.endsWith("pipeline-graph/")
      ? "tree"
      : "pipeline-graph/tree";
  };

  const updateLayout = (newStages: StageInfo[] = []) => {
    const newLayout = layoutGraph(
      newStages,
      layoutState,
      collapsed ?? false,
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
      (currentSelectedStage &&
        stage &&
        currentSelectedStage.id === stage.id) ||
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
          <Node key={node.id} node={node} />
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
  path?: string;
  /**
   * Optional path of the previous build
   */
  previousPath?: string;
  collapsed?: boolean;
}

export const markSkeleton = (stages: StageInfo[]): StageInfo[] =>
  stages.map(s => ({
    ...s,
    skeleton: true,
    completePercent: 0,
    children: markSkeleton(s.children ?? [])
  }));

export const mergeStageInfos = (skeletons: StageInfo[], incoming: StageInfo[]): StageInfo[] => {
  const merged = incoming.map(incomingItem => {
    const match = skeletons.find(s => s.name === incomingItem.name);

    return {
      ...(match ?? {}),
      ...incomingItem,
      skeleton: false,
      children: mergeStageInfos(match?.children ?? [], incomingItem.children ?? [])
    };
  });

  const unmatchedSkeletons = skeletons.filter(
    s => !incoming.some(i => i.name === s.name)
  );

  return [...merged, ...unmatchedSkeletons];
};

// Optional helper: strip skeleton flags from incoming before replacing
export const stripSkeleton = (stage: StageInfo): StageInfo => ({
  ...stage,
  skeleton: false,
  completePercent: 0,
  children: stage.children?.map(stripSkeleton) ?? []
});