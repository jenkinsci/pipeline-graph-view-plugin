import * as React from "react";

import TreeView from "@material-ui/lab/TreeView";
//import TreeItem from "@material-ui/lab/TreeItem";
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

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 264,
      flexGrow: 1,
      maxWidth: 400,
    },
  })
);

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
  })
)((props: TreeItemProps) => <TreeItem {...props} />);

// Tree Item for steps
const StepTreeItem = withStyles((theme: Theme) =>
  createStyles({
    label: {
      fontWeight: "bold",
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
  stageSteps: Map<String, StepInfo[]>
) => {

  // TODO: Refactor to make more DRY
  return stageItems.map((stageItemData) => {
    if (stageItemData.children && stageItemData.children.length > 0) {
      let children = getTreeItemsFromStage(stageItemData.children, stageSteps);
      let steps = stageSteps.get(`${stageItemData.id}`);
      if (steps) {
        console.log(`!!!!Found steps for ${stageItemData.id}, ${steps}`);
        let stepsItems = getTreeItemsFromStepList(steps);
        children = [...children, ...stepsItems];
      } else {
        console.log(`????Found no steps for ${stageItemData.id}`);
      }
      return (
        <StageTreeItem
          key={stageItemData.id}
          nodeId={String(stageItemData.id)}
          label={stageItemData.name}
          children={children}
        />
      );
    } else {
      let steps = stageSteps.get(`${stageItemData.id}`);
      if (steps) {
        let stepsItems = getTreeItemsFromStepList(steps);
        return (
          <StageTreeItem
            key={stageItemData.id}
            nodeId={String(stageItemData.id)}
            label={stageItemData.name}
            children={stepsItems}
          />
        );
      } else {
        return (
          <StageTreeItem
            key={stageItemData.id}
            nodeId={String(stageItemData.id)}
            label={stageItemData.name}
          />
        );
      }
    }
  });
};

interface DataTreeViewProps {
  stages: Array<StageInfo>;
  onActionNodeSelect: (event: React.ChangeEvent<any>, nodeIds: string) => void;
}

interface State {
  stages: Array<StageInfo>;
  steps: Map<String, StepInfo[]>;
}

export class DataTreeView extends React.Component {
  props!: DataTreeViewProps;
  state: State;

  constructor(props: DataTreeViewProps) {
    super(props);
    this.state = {
      stages: [],
      steps: new Map(),
    };
  }

  componentDidMount() {
    fetch("tree")
      .then((res) => res.json())
      .then((result) =>
        // Get steps for a each stage and add to 'steps' state
        this.setState(
          {
            stages: result.data.stages,
          },
          () => {
            // Add Steps to state - consider moving this code to a new function.
            this.state.stages.forEach((stageData) => {
              fetch(`steps?nodeId=${stageData.id}`)
                .then((step_res) => step_res.json())
                .then((step_result) =>
                  this.setState({
                    steps: new Map(
                      this.state.steps.set(`${stageData.id}`, step_result.steps)
                    ),
                  })
                );
            });
          }
        )
      )
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
        // Change so that onNodeSelect is a function which calls the 'stageActions'
        // endpoint. That would return the list of actions for a Stage (so we only
        // load actions that the user is interested in).
        // Then we will pass 'this.props.onNodeSelect' into the Action `TreeItem`
        // elements only (so stages do not update the console section).
        onNodeSelect={this.props.onActionNodeSelect}
      >
        {getTreeItemsFromStage(this.state.stages, this.state.steps)}
      </TreeView>
    );
  }
}
