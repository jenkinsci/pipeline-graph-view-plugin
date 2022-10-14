import React from "react";
import TreeView from "@material-ui/lab/TreeView/";

import {
  fade,
  withStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import TreeItem, { TreeItemProps } from "@material-ui/lab/TreeItem";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import Tooltip from '@material-ui/core/Tooltip';

import {
  StageInfo,
  Result,
} from "../../../pipeline-graph-view/pipeline-graph/main/";
import StepStatus from "../../../step-status/StepStatus";
import { decodeResultValue } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";


const HtmlTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: 'var(--card-background)',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid #dadde9',
    opacity: '0.8 !important',
  },
}))(Tooltip);

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
      <HtmlTooltip
        title={stepItemData.name}
        placement="right-start"
        enterDelay={500}
        leaveDelay={200}
        disableFocusListener={true}
        arrow={true}
        interactive={true}
      >
        <div>
          <StepTreeItem
            key={stepItemData.id}
            nodeId={String(stepItemData.id)}
            label={
              <StepStatus
                status={decodeResultValue(stepItemData.state)}
                text={stepItemData.name.replace(/[^ -~]+/g, "")}
              />
            }
          />
        </div>
      </HtmlTooltip>
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
      <div>
        <StageTreeItem
          key={stageItemData.id}
          nodeId={String(stageItemData.id)}
          label={
            <StepStatus
              status={decodeResultValue(stageItemData.state)}
              text={stageItemData.name}
            />
          }
          children={children}
          classes={{
            label: stageItemData.synthetic
              ? "pgv-graph-node--synthetic"
              : undefined,
          }}
        />
      </div>
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
      >
        {getTreeItemsFromStage(this.props.stages, this.props.steps)}
      </TreeView>
    );
  }
}
