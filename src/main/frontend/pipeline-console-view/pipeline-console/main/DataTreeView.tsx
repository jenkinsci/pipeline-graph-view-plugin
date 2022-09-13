import React, { useEffect, useState } from "react";

import TreeView from "@material-ui/lab/TreeView";

import {
  fade,
  makeStyles,
  withStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import TreeItem, { TreeItemProps } from "@material-ui/lab/TreeItem";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import {
  StageInfo,
  Result,
} from "../../../pipeline-graph-view/pipeline-graph/main/";

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
}

export interface TreeItemData {
  id: string;
  name: string;
  children: TreeItemData[];
}

interface StageTreeItemProps extends TreeItemProps {
  synthetic?: boolean;
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
    label: {
      fontStyle: (props: StageTreeItemProps) =>
        props.synthetic ? "italic" : "inherit",
    },
  })
)((props: StageTreeItemProps) => <TreeItem {...props} />);

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
        label={stepItemData.name}
      />
    );
  });
};

const getTreeItemsFromStage = (
  stageItems: StageInfo[],
  stageSteps: Map<string, StepInfo[]>
) => {
  return stageItems.map((stageItemData) => {
    let children: JSX.Element[] = [];
    if (stageItemData.children && stageItemData.children.length > 0) {
      children = [...getTreeItemsFromStage(stageItemData.children, stageSteps)];
    }
    let steps = stageSteps.get(`${stageItemData.id}`);
    if (steps) {
      let stepsItems = getTreeItemsFromStepList(steps);
      children = [...children, ...stepsItems];
    }
    return (
      <StageTreeItem
        key={stageItemData.id}
        nodeId={String(stageItemData.id)}
        label={stageItemData.name}
        children={children}
        synthetic={stageItemData.synthetic}
      />
    );
  });
};

interface DataTreeViewProps {
  stages: Array<StageInfo>;
  onActionNodeSelect: (event: React.ChangeEvent<any>, nodeIds: string) => void;
}

interface State {
  stages: Array<StageInfo>;
  steps: Map<string, StepInfo[]>;
  expanded: Array<string>;
}

export class DataTreeView extends React.Component {
  props!: DataTreeViewProps;
  state: State;

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

  getStepsForStageTree(stage: StageInfo): void {
    // TODO: This should change to getting all the steps in one API call.
    // Otherwise large Pipelines will make a lot of API calls (one per stage).
    fetch(`steps?nodeId=${stage.id}`)
      .then((step_res) => step_res.json())
      .then((step_result) => {
        this.setState({
          steps: new Map(
            this.state.steps.set(`${stage.id}`, step_result.steps)
          ),
        });
      });
    if (stage.children && stage.children.length > 0) {
      stage.children.forEach((childStage) => {
        this.getStepsForStageTree(childStage);
      });
    }
  }

  getNodeHierarchy(nodeId: string, stages: StageInfo[]): Array<string> {
    for (let i = 0; i < stages.length; i++) {
      let stage = stages[i];
      if (String(stage.id) == nodeId) {
        // Found the node, so start a list of expanded nodes - it will be this and it's ancestors.
        return [String(stage.id)];
      } else if (stage.children && stage.children.length > 0) {
        let expandedNodes = this.getNodeHierarchy(nodeId, stage.children);
        if (expandedNodes.length > 0) {
          // Our child is expanded, so we need to be expanded too.
          expandedNodes.push(String(stage.id));
          return expandedNodes;
        }
      }
    }
    return [];
  }

  componentDidMount() {
    let params = new URLSearchParams(document.location.search.substring(1));
    let selectedNode = params.get("selected-node") || "";
    fetch("tree")
      .then((res) => res.json())
      .then((result) => {
        // Get steps for a each stage and add to 'steps' state
        this.setState(
          {
            stages: result.data.stages,
            expanded: this.getNodeHierarchy(selectedNode, result.data.stages),
          },
          () => {
            this.state.stages.forEach((stageData) => {
              this.getStepsForStageTree(stageData);
            });
          }
        );
      })
      .catch(console.log);
  }

  handleOnNodeSelect() {
    this.props.onActionNodeSelect;
  }

  render() {
    return (
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        onNodeSelect={this.props.onActionNodeSelect}
        expanded={this.state.expanded}
        onNodeToggle={this.handleToggle}
      >
        {getTreeItemsFromStage(this.state.stages, this.state.steps)}
      </TreeView>
    );
  }
}
