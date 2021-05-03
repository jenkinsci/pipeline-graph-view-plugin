import * as React from "react";

import TreeView from "@material-ui/lab/TreeView";
import TreeItem from "@material-ui/lab/TreeItem";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { StageInfo } from '../../../pipeline-graph-view/pipeline-graph/main/';

export interface TreeItemData {
  id: string;
  name: string;
  children: TreeItemData[];
}

const getTreeItemsFromData = (treeItems: StageInfo[]) => {
  return treeItems.map(treeItemData => {
    let children = undefined;
    if (treeItemData.children && treeItemData.children.length > 0) {
      children = getTreeItemsFromData(treeItemData.children);
    }
    return (
      <TreeItem
        key={treeItemData.id}
        nodeId={String(treeItemData.id)}
        label={treeItemData.name}
        children={children}
      />
    );
  });
};

interface DataTreeViewProps {
    stages: Array<StageInfo>;
    //onNodeSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onNodeSelect: (event: React.ChangeEvent<any>, nodeIds: string) => void;
}

interface State {
    stages: Array<StageInfo>;
    //onNodeSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
    //onNodeSelect: (event: React.ChangeEvent<any>, nodeIds: string) => void;
}

export class DataTreeView extends React.Component {
    props!: DataTreeViewProps;
    state: State;

    constructor(props: DataTreeViewProps) {
        super(props);
        this.state = {
            stages: [],
            //onNodeSelect: props.onNodeSelect
        }
    }

    componentDidMount() {
        fetch('graph')
            .then(res => res.json())
            .then((result) => this.setState({
                stages: result.data.stages
            }))
        .catch(console.log);
    }

    render() {
        return <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            onNodeSelect={this.props.onNodeSelect}
        >
            {getTreeItemsFromData(this.state.stages)}
        </TreeView>
    }
}
