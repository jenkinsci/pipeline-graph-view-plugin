import * as React from "react";

import startPollingPipelineStatus from "./support/startPollingPipelineStatus";
import {
  CompositeConnection,
  defaultLayout,
  NodeLabelInfo,
  LayoutInfo,
  NodeColumn,
  NodeInfo,
  StageInfo,
} from "./PipelineGraphModel";
import { layoutGraph } from "./PipelineGraphLayout";

import { Node, SelectionHighlight } from "./support/nodes";
import {
  BigLabel,
  SmallLabel,
  SequentialContainerLabel,
} from "./support/labels";
import { GraphConnections } from "./support/connections";

interface Props {
  stages: Array<StageInfo>;
  layout?: Partial<LayoutInfo>;
  setStages?: (stages: Array<StageInfo>) => void;
  onNodeClick?: (nodeName: string, id: number) => void;
  selectedStage?: StageInfo;
  path?: string;
  collapsed?: boolean;
}

interface State {
  nodeColumns: Array<NodeColumn>;
  connections: Array<CompositeConnection>;
  bigLabels: Array<NodeLabelInfo>;
  smallLabels: Array<NodeLabelInfo>;
  branchLabels: Array<NodeLabelInfo>;
  measuredWidth: number;
  measuredHeight: number;
  layout: LayoutInfo;
  selectedStage?: StageInfo;
}

export class PipelineGraph extends React.Component {
  props!: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      nodeColumns: [],
      connections: [],
      bigLabels: [],
      smallLabels: [],
      branchLabels: [],
      measuredWidth: 0,
      measuredHeight: 0,
      layout: { ...defaultLayout, ...props.layout },
      selectedStage: props.selectedStage,
    };
  }

  componentDidMount() {
    const onPipelineDataReceived = (data: { stages: Array<StageInfo> }) => {
      const { stages } = data;
      this.setState({ stages });
      this.stagesUpdated(stages);
    };
    const onPollingError = (err: Error) => {
      console.log("There was an error when polling the pipeline status", err);
    };
    const onPipelineComplete = () => undefined;

    startPollingPipelineStatus(
      onPipelineDataReceived,
      onPollingError,
      onPipelineComplete,
      this.props.path ?? this.getTreePath(),
    );
  }

  getTreePath() {
    if (!window.location.href.endsWith("pipeline-graph/")) {
      return `pipeline-graph/tree`;
    }

    return "tree";
  }

  componentWillReceiveProps(nextProps: Props) {
    let newState: Partial<State> | undefined;
    let needsLayout = false;

    if (nextProps.layout != this.props.layout) {
      newState = {
        ...newState,
        layout: { ...defaultLayout, ...this.props.layout },
      };
      needsLayout = true;
    }

    if (nextProps.selectedStage !== this.props.selectedStage) {
      // If we're just changing selectedStage, we don't need to re-generate the children
      newState = { ...newState, selectedStage: nextProps.selectedStage };
    }

    if (nextProps.stages !== this.props.stages) {
      needsLayout = true;
    }

    const doLayoutIfNeeded = () => {
      if (needsLayout) {
        this.stagesUpdated(nextProps.stages);
      }
    };

    if (newState) {
      // If we need to update the state, then we'll delay any layout changes
      this.setState(newState, doLayoutIfNeeded);
    } else {
      doLayoutIfNeeded();
    }
  }

  /**
   * Main process for laying out the graph. Calls out to PipelineGraphLayout module.
   */
  private stagesUpdated(newStages: Array<StageInfo> = []) {
    if (this.props.setStages != undefined) {
      this.props.setStages(newStages);
    }
    this.setState(
      layoutGraph(newStages, this.state.layout, this.props.collapsed ?? false),
    );
  }

  /**
   * Is this stage currently selected?
   */
  private stageIsSelected = (stage?: StageInfo): boolean => {
    const { selectedStage } = this.state;
    return (selectedStage && stage && selectedStage.id === stage.id) || false;
  };

  private handleNodeClick = (node: NodeInfo) => {
    if (node.isPlaceholder === false && node.stage.state !== "skipped") {
      const stage = node.stage;
      const listener = this.props.onNodeClick;

      if (listener) {
        listener(stage.name, stage.id);
      }

      // Update selection
      this.setState({ selectedStage: stage });
    }
  };

  render() {
    const {
      nodeColumns,
      connections,
      bigLabels,
      smallLabels,
      branchLabels,
      measuredWidth,
      measuredHeight,
    } = this.state;

    // Without these we get fire, so they're hardcoded
    const outerDivStyle = {
      position: "relative", // So we can put the labels where we need them
      overflow: "visible", // So long labels can escape this component in layout
    };

    let nodes = [];
    for (const column of nodeColumns) {
      for (const row of column.rows) {
        for (const node of row) {
          nodes.push(node);
        }
      }
    }

    return (
      <div className="PWGx-PipelineGraph-container">
        <div style={outerDivStyle as any} className="PWGx-PipelineGraph">
          <svg width={measuredWidth} height={measuredHeight}>
            <GraphConnections
              connections={connections}
              layout={this.state.layout}
            />

            {nodes.map((node) => (
              <Node
                key={node.id}
                node={node}
                layout={this.state.layout}
                onClick={this.handleNodeClick}
                isStageSelected={this.stageIsSelected}
              />
            ))}
            <SelectionHighlight
              layout={this.state.layout}
              nodeColumns={this.state.nodeColumns}
              isStageSelected={this.stageIsSelected}
            />
          </svg>

          {bigLabels.map((label) => (
            <BigLabel
              key={label.key}
              details={label}
              layout={this.state.layout}
              measuredHeight={measuredHeight}
              selectedStage={this.state.selectedStage}
              isStageSelected={this.stageIsSelected}
            />
          ))}
          {smallLabels.map((label) => (
            <SmallLabel
              key={label.key}
              details={label}
              layout={this.state.layout}
              isStageSelected={this.stageIsSelected}
            />
          ))}
          {branchLabels.map((label) => (
            <SequentialContainerLabel
              key={label.key}
              details={label}
              layout={this.state.layout}
            />
          ))}
        </div>
      </div>
    );
  }
}
