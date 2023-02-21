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

const getTreeItemsFromStage = (stageItems: StageInfo[]) => {
  return stageItems.map((stageItemData) => {
    console.debug(
      `Generating stage item(s) for '${stageItemData.name} - ${stageItemData.id}'.`
    );
    let children: JSX.Element[] = [];
    if (stageItemData.children && stageItemData.children.length > 0) {
      children = getTreeItemsFromStage(stageItemData.children);
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
        onNodeSelect={this.props.onNodeSelect}
        expanded={this.props.expanded}
        selected={this.props.selected}
        onNodeToggle={this.props.onNodeToggle}
        key="console-tree-view"
      >
        {getTreeItemsFromStage(this.props.stages)}
      </TreeView>
    );
  }
}
