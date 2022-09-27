
import React from "react";

import TreeView from "@material-ui/lab/TreeView/";

import TreeItem, { TreeItemProps } from "@material-ui/lab/TreeItem";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import {
  StageInfo,
  Result,
} from "../../../pipeline-graph-view/pipeline-graph/main/";

import {
  fade,
  withStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
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
}

// Tree Item for stages
const StageTreeItem = withStyles((theme: Theme) =>
  createStyles({
    iconContainer: {
      "& .close": {
        opacity: 0.3,
      },
    },
    // TODO: Make line show status of block (green = passed, red = failed, etc.)
    group: {
      marginLeft: 7,
      paddingLeft: 18,
      borderLeft: `1px dashed ${fade(theme.palette.text.primary, 0.4)}`,
    },
    label: {},
  })
)((props: TreeItemProps) => <TreeItem {...props} />);

// Tree Item for steps
const StepTreeItem = withStyles((theme: Theme) =>
  createStyles({
    label: {
      textDecoration: "underline",
    },
  })
)((props: TreeItemProps) => <TreeItem {...props} />);

const getTreeItemsFromStepList = (stepsItems: StepInfo[]) => {
  return stepsItems.map((stepItemData) => {
    return (
      <StepTreeItem
        key={stepItemData.id}
        nodeId={String(stepItemData.id)}
        label={stepItemData.name.replace(/[^ -~]+/g, "")}
      />
    );
  });
};

const getTreeItemsFromStage = (
  stageItems: StageInfo[],
  steps: StepInfo[],
) => {
  // Copy steps so we don't affect props.steps.
  let stepsCopy = [...steps];
  return stageItems.map((stageItemData) => {
    let children: JSX.Element[] = [];
    let stageSteps = [] as StepInfo[];
    // Handle leaf nodes first.
    if (stageItemData.children && stageItemData.children.length > 0) {
      children = getTreeItemsFromStage(stageItemData.children, stepsCopy);
    }
    var i = stepsCopy.length
    while (i--) {
      let step = stepsCopy[i];
      if (step.stageId == String(stageItemData.id)) {
        // Prepend to array (as we are iterating in reverse).
        stageSteps.unshift(step);
        // Remove step from local copy - can only have one parent.
        // This should reduce the total number of loops required.
        stepsCopy.splice(i, 1);
      }
    };
    if (stageSteps) {
      let stepsItems = getTreeItemsFromStepList(stageSteps);
      children = [...children, ...stepsItems];
    }
    return (
      <StageTreeItem
        key={stageItemData.id}
        nodeId={String(stageItemData.id)}
        label={stageItemData.name}
        children={children}
        classes={{
          label: stageItemData.synthetic
            ? "pgw-graph-node--synthetic"
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
      >
        {getTreeItemsFromStage(this.props.stages, this.props.steps)}
      </TreeView>
    );
  }
}
