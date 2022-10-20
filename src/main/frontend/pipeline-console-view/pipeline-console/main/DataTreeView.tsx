import React from "react";
import TreeView from "@mui/lab/TreeView/";

import TreeItem from "@mui/lab/TreeItem";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import {
  StageInfo,
  Result,
} from "../../../pipeline-graph-view/pipeline-graph/main/";
import StepStatus from "../../../step-status/StepStatus";
import { decodeResultValue } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

/**
 * StageInfo is the input, in the form of an Array<StageInfo> of the top-level stages of a pipeline
 */
export interface StepInfo {
  name: string;
  title: string;
  state: Result;
  completePercent: number;
  id: number;
  type: string;
  stageId: string;
  pauseDurationMillis: string;
  startTimeMillis: string;
  totalDurationMillis: string;
}

const getTreeItemsFromStepList = (stepsItems: StepInfo[]) => {
  return stepsItems.map((stepItemData) => {
    return (
      <TreeItem
        className="step-tree-item"
        key={stepItemData.id}
        nodeId={String(stepItemData.id)}
        label={
          <StepStatus
            status={decodeResultValue(stepItemData.state)}
            text={stepItemData.name.replace(/[^ -~]+/g, "")}
            key={`status-${stepItemData.id}`}
          />
        }
      />
    );
  });
};

const getTreeItemsFromStage = (stageItems: StageInfo[], steps: StepInfo[]) => {
  // Copy steps so we don't affect props.steps.
  let stepsCopy = [...steps];
  return stageItems.map((stageItemData) => {
    let children: JSX.Element[] = [];
    let stageSteps = [] as StepInfo[];
    // Handle leaf nodes first.
    if (stageItemData.children && stageItemData.children.length > 0) {
      children = getTreeItemsFromStage(stageItemData.children, stepsCopy);
    }
    var i = stepsCopy.length;
    while (i--) {
      let step = stepsCopy[i];
      if (step.stageId == String(stageItemData.id)) {
        // Prepend to array (as we are iterating in reverse).
        stageSteps.unshift(step);
        // Remove step from local copy - can only have one parent.
        // This should reduce the total number of loops required.
        stepsCopy.splice(i, 1);
      }
    }
    if (stageSteps) {
      let stepsItems = getTreeItemsFromStepList(stageSteps);
      children = [...children, ...stepsItems];
    }
    return (
      <TreeItem
        className="stage-tree-item"
        key={stageItemData.id}
        nodeId={String(stageItemData.id)}
        label={
          <StepStatus
            status={decodeResultValue(stageItemData.state)}
            text={stageItemData.name}
            key={`status-${stageItemData.id}`}
          />
        }
        children={children}
        classes={{
          label: stageItemData.synthetic
            ? "pgv-graph-node--synthetic"
            : undefined,
        }}
      />
    );
  });
};

interface DataTreeViewProps {
  stages: Array<StageInfo>;
  onNodeSelect: (event: React.ChangeEvent<any>, nodeId: string) => void;
  onNodeToggle: (event: React.ChangeEvent<any>, nodeIds: string[]) => void;
  selected: string;
  expanded: string[];
  steps: StepInfo[];
}

export class DataTreeView extends React.Component {
  props!: DataTreeViewProps;

  constructor(props: DataTreeViewProps) {
    super(props);
    this.state = {
      stages: [],
      steps: new Map(),
      expanded: [],
    };
    this.handleToggle = this.handleToggle.bind(this);
  }

  handleToggle(event: React.ChangeEvent<{}>, nodeIds: string[]): void {
    this.setState({
      expanded: nodeIds,
    });
  }

  render() {
    return (
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        onNodeSelect={this.props.onNodeSelect}
        expanded={this.props.expanded}
        selected={this.props.selected}
        onNodeToggle={this.props.onNodeToggle}
        key="console-tree-view"
      >
        {getTreeItemsFromStage(this.props.stages, this.props.steps)}
      </TreeView>
    );
  }
}
