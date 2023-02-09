import React from "react";

import { SplitPane } from "react-collapse-pane";
import {
  StageInfo,
  Result,
} from "../../../pipeline-graph-view/pipeline-graph/main/";
import { DataTreeView, StepInfo } from "./DataTreeView";
import { StageView } from "./StageView";

import "./pipeline-console.scss";

interface PipelineConsoleProps {}
interface PipelineConsoleState {
  selected: string;
  expanded: string[];
  stages: Array<StageInfo>;
  steps: Array<StepInfo>;
  anchor: string;
  hasScrolled: boolean;
}

export class PipelineConsole extends React.Component<
  PipelineConsoleProps,
  PipelineConsoleState
> {
  constructor(props: PipelineConsoleProps) {
    super(props);
    this.handleActionNodeSelect = this.handleActionNodeSelect.bind(this);
    this.handleToggle = this.handleToggle.bind(this);
    this.updateStepConsoleText = this.updateStepConsoleText.bind(this);

    // set default values of state
    this.state = {
      // Need to update dynamically
      selected: "",
      expanded: [] as string[],
      stages: [] as StageInfo[],
      steps: [] as StepInfo[],
      anchor: window.location.hash.replace("#", ""),
      hasScrolled: false,
    };
    console.debug(`Anchor: ${this.state.anchor}`);
    this.updateState();
  }

  // State update methods
  async updateState() {
    this.setStages();
    this.setSteps();
  }

  // Determines the default selected step in the tree view based
  getDefaultSelectedStep(steps: StepInfo[]) {
    let selectedStep = steps.find((step) => step !== undefined);
    for (let i = 0; i < steps.length; i++) {
      let step = steps[i];
      let stepResult = step.state.toLowerCase() as Result;
      switch (stepResult) {
        case Result.running:
        case Result.queued:
        case Result.paused:
          return step;
        case Result.unstable:
        case Result.failure:
        case Result.aborted:
          let selectedStepResult = selectedStep?.state.toLowerCase() as Result;
          if (!selectedStepResult || stepResult > selectedStepResult) {
            selectedStep = step;
          }
          break;
      }
    }
    return selectedStep;
  }

  setStages() {
    // Sets stages state.
    return fetch("tree")
      .then((res) => res.json())
      .then((result) => {
        console.debug("Updating stages");
        this.setState(
          {
            stages: result.data.stages,
          },
          () => {
            this.selectNode();
          }
        );
      });
  }

  setSteps() {
    return fetch(`allSteps`)
      .then((step_res) => step_res.json())
      .then((step_result) => {
        console.debug("Updating steps");
        this.setState(
          {
            steps: step_result.data.steps,
          },
          () => {
            this.selectNode();
          }
        );
      })
      .catch(console.log);
  }

  getStageSteps(stageId: string) {
    let stepsCopy = [...this.state.steps];
    let i = stepsCopy.length;
    while (i--) {
      let step = stepsCopy[i];
      if (step.stageId != stageId) {
        // Remove step from local copy - can only have one parent.
        // This should reduce the total number of loops required.
        stepsCopy.splice(i, 1);
      }
    }
    return stepsCopy;
  }
  /*setConsoleText(stepId: string) {
    if (stepId !== this.state.selected) {
      fetch(`consoleOutput?nodeId=${stepId}`)
        .then((res) => res.json())
        .then((res) => {
          console.debug("Updating consoleText");
          this.setState({
            // Strip trailing whitespace.
            consoleText: res.data.text.replace(/\s+$/, ""),
          });
        })
        .catch(console.log);
    } else {
      console.debug("Skipping consoleText update (node already selected).");
    }
  }*/

  getConsoleText(stepId: string): Promise<string> {
    return fetch(`consoleOutput?nodeId=${stepId}`)
      .then((res) => res.json())
      .then((res) => {
        // Strip trailing whitespace.
        return res.data.text.replace(/\s+$/, "");
      });
  }

  selectNode() {
    console.debug(`In selectNode.`);
    let params = new URLSearchParams(document.location.search.substring(1));
    let selected = params.get("selected-node") || "";
    if (selected) {
      console.debug(`Node '${selected}' selected.`);
      let expanded = this.getStageNodeHierarchy(selected, this.state.stages);
      this.setState({
        selected: selected,
        expanded: expanded,
      });
    } else {
      console.debug("No node selected.");
    }
  }

  componentDidUpdate() {
    console.debug(`In componentDidUpdate.`);
    // only attempt to scroll if we haven't yet (this could have just reset above if hash changed)
    if (this.state.anchor && !this.state.hasScrolled) {
      console.debug(`Trying to scroll to ${this.state.anchor}`);
      const element = document.getElementById(this.state.anchor);
      if (element !== null) {
        console.debug(`Found element '${this.state.anchor}', scrolling...`);
        element.scrollIntoView();
        this.setState({
          hasScrolled: true,
        });
      } else {
        console.debug(`Could not find element '${this.state.anchor}'`);
      }
    }
  }

  /* Event handlers */
  handleActionNodeSelect(event: React.ChangeEvent<any>, nodeId: string) {
    // If we get console response, we know that this is a step.
    this.setState({ selected: nodeId });
  }

  handleToggle(event: React.ChangeEvent<{}>, nodeIds: string[]): void {
    this.setState({
      expanded: nodeIds,
    });
  }

  updateStepConsoleText(event: React.SyntheticEvent<{}>, nodeId: string): void {
    let updatedSteps = this.state.steps;
    for (let step of updatedSteps) {
      if (nodeId == String(step.id)) {
        if (!step.consoleText) {
          console.debug(`Updating console text for step ${step.id}`);
          let promise = this.getConsoleText(String(step.id));
          promise.then((res) => {
            step.consoleText = res;
            this.setState({
              steps: updatedSteps,
            });
          });
        } else {
          console.debug(
            `Skipping update of console text for step ${step.id} - already set.`
          );
        }
        break;
      }
    }
  }

  // Gets the selected step in the tree view (or none if not selected).
  getStepWithId(nodeId: string, steps: StepInfo[]) {
    let foundStep = steps.find((step) => String(step.id) == nodeId);
    if (!foundStep) {
      console.debug(`No step found with nodeID ${nodeId}`);
    }
    return foundStep;
  }

  // Gets the node hierarchy of stages in the tree view (a list of child -> parent -> grandparent).
  // This needs to be given the nodeId of a stage, so call getSelectedStep first to see if the nodeId
  // is a step - and if so pass it step.stageId.
  getStageNodeHierarchy(nodeId: string, stages: StageInfo[]): Array<string> {
    for (let i = 0; i < stages.length; i++) {
      let stage = stages[i];
      if (String(stage.id) == nodeId) {
        // Found the node, so start a list of expanded nodes - it will be this and it's ancestors.
        return [String(stage.id)];
      } else if (stage.children && stage.children.length > 0) {
        let expandedNodes = this.getStageNodeHierarchy(nodeId, stage.children);
        if (expandedNodes.length > 0) {
          // Our child is expanded, so we need to be expanded too.
          expandedNodes.push(String(stage.id));
          return expandedNodes;
        }
      }
    }
    return [];
  }

  getSelectedStage(): StageInfo | null {
    let selectedStage = this.getStageFromList(
      this.state.stages,
      this.state.selected
    );
    if (selectedStage) {
      return selectedStage;
    }
    console.debug(`Couldn't find stage '${this.state.selected}'`);
    return null;
  }

  getStageFromList(stages: StageInfo[], nodeId: String): StageInfo | null {
    for (let stage of stages) {
      if (stage.id == parseInt(this.state.selected)) {
        return stage;
      }
      if (stage.children.length > 0) {
        let selectedStage = this.getStageFromList(stage.children, nodeId);
        if (selectedStage) {
          return selectedStage;
        }
      }
    }
    return null;
  }

  render() {
    const splitPaneStyle: React.CSSProperties = {
      position: "relative",
    };
    const paneStyle: React.CSSProperties = {
      paddingLeft: "8px",
      textAlign: "left",
      height: "calc(100vh - 300px)",
      overflowY: "auto",
    };
    return (
      <React.Fragment>
        <div className="App">
          <SplitPane
            // intialSize ratio
            initialSizes={[3, 7]}
            // minSize in Pixels (for all panes)
            minSizes={250}
            className="split-pane"
            split="vertical"
          >
            <div className="split-pane" key="tree-view">
              <DataTreeView
                onNodeSelect={this.handleActionNodeSelect}
                onNodeToggle={this.handleToggle}
                selected={this.state.selected}
                expanded={this.state.expanded}
                stages={this.state.stages}
                steps={this.state.steps}
              />
            </div>

            <div className="split-pane" key="console-view">
              <StageView
                stage={this.getSelectedStage()}
                steps={this.getStageSteps(this.state.selected)}
                selected={this.state.selected}
                updateStepConsoleText={this.updateStepConsoleText}
              />
            </div>
          </SplitPane>
        </div>
      </React.Fragment>
    );
  }
}
