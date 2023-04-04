import React from "react";
import TreeView from "@mui/lab/TreeView/";
import TreeItem from "@mui/lab/TreeItem";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { StageInfo } from "../../../pipeline-graph-view/pipeline-graph/main/";
import StepStatus from "../../../step-status/StepStatus";

const getTreeItemsFromStage = (
  stageItems: StageInfo[],
  selectedStage: string
) => {
  return stageItems.map((stageItemData) => {
    let children: JSX.Element[] = [];
    if (stageItemData.children && stageItemData.children.length > 0) {
      children = getTreeItemsFromStage(stageItemData.children, selectedStage);
    }
    return (
      <TreeItem
        className={
          String(stageItemData.id) == selectedStage
            ? "stage-tree-item-selected"
            : "stage-tree-item"
        }
        key={stageItemData.id}
        nodeId={String(stageItemData.id)}
        label={
          <StepStatus
            status={stageItemData.state}
            text={stageItemData.name}
            key={`status-${stageItemData.id}`}
            percent={stageItemData.completePercent}
            radius={10}
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

export interface DataTreeViewProps {
  stages: Array<StageInfo>;
  onNodeToggle: (event: React.ChangeEvent<any>, nodeIds: string[]) => void;
  onNodeSelect: (event: React.ChangeEvent<any>, nodeIds: string) => void;
  selected: string;
  expanded: string[];
}

export default class DataTreeView extends React.Component {
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
        expanded={this.props.expanded}
        selected={this.props.selected}
        onNodeToggle={this.props.onNodeToggle}
        onNodeSelect={this.props.onNodeSelect}
        key="console-tree-view"
      >
        {getTreeItemsFromStage(this.props.stages, this.props.selected)}
      </TreeView>
    );
  }
}
