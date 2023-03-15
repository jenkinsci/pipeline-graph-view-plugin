import React from "react";
import { lazy, Suspense } from "react";
import { SplitPane } from "react-collapse-pane";

import { LOG_FETCH_SIZE, StepLogBufferInfo } from "./PipelineConsoleModel";
import { CircularProgress } from "@mui/material";

import "./pipeline-console.scss";
import {
  StageInfo,
  StepInfo,
  Result,
  ConsoleLogData,
} from "./PipelineConsoleModel";

const DataTreeView = lazy(() => import("./DataTreeView"));
const StageView = lazy(() => import("./StageView"));

interface PipelineConsoleProps {}

interface PipelineConsoleState {
  selectedStage: string;
  expandedStages: string[];
  expandedSteps: string[];
  stages: Array<StageInfo>;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  anchor: string;
  hasScrolled: boolean;
  isComplete: boolean;
}

export default class PipelineConsole extends React.Component<
  PipelineConsoleProps,
  PipelineConsoleState
> {
  constructor(props: PipelineConsoleProps) {
    super(props);
    this.handleActionNodeSelect = this.handleActionNodeSelect.bind(this);
    this.handleToggle = this.handleToggle.bind(this);
    this.handleStepToggle = this.handleStepToggle.bind(this);
    this.handleMoreConsoleClick = this.handleMoreConsoleClick.bind(this);

    // set default values of state
    this.state = {
      // Need to update dynamically
      selectedStage: "",
      expandedStages: [] as string[],
      expandedSteps: [] as string[],
      stages: [] as StageInfo[],
      steps: [] as StepInfo[],
      stepBuffers: new Map<string, StepLogBufferInfo>(),
      anchor: window.location.hash.replace("#", ""),
      hasScrolled: false,
      isComplete: false,
    };
    console.debug(`Anchor: ${this.state.anchor}`);
  }

  // State update methods
  async updateState() {
    // Call functions in parallel.
    const updateStages = async () => {
      this.setStages();
    };
    const updateSteps = async () => {
      this.setSteps();
    };
    await Promise.allSettled([updateStages(), updateSteps()]);
  }

  // Trigger poller when component mounts.
  componentDidMount() {
    this.pollForUpdates();
  }

  pollForUpdates() {
    // Poll for updates every  second until the Pipeline is complete.
    // This updates the structure of the DataTreeView and the steps, not the console log.
    this.updateState();
    if (this.state.isComplete) {
      this.onPipelineComplete();
    } else {
      setTimeout(() => this.pollForUpdates(), 1000);
    }
  }

  onPipelineComplete() {
    console.debug("Pipeline completed.");
  }

  // Determines the default selected step.
  getDefaultSelectedStep(steps: StepInfo[]) {
    let selectedStep = steps.find((step) => step !== undefined);
    for (let i = 0; i < steps.length; i++) {
      let step = steps[i];
      let stepResult = step.state.toLowerCase() as Result;
      let selectedStepResult = selectedStep?.state.toLowerCase() as Result;
      switch (stepResult) {
        case Result.running:
        case Result.queued:
        case Result.paused:
          // Return first running/queued/paused step.
          return step;
        case Result.unstable:
        case Result.failure:
        case Result.aborted:
          if (!selectedStepResult || stepResult > selectedStepResult) {
            // Return first unstable/failed/aborted step which has a state worse than the selectedStep.
            // E.g. if the first step state is failure we want to return that over a later unstable step.
            return step;
          }
        default:
          // Otherwise select the step with the worst result with the largest id - e.g. (last step if all successful).
          if (!selectedStepResult || stepResult > selectedStepResult) {
            selectedStep = step;
          }
      }
    }
    return selectedStep;
  }

  setStages() {
    // Sets stages state.
    return fetch("tree")
      .then((res) => res.json())
      .then((result) => {
        this.setState(
          {
            stages: result.data.stages,
            isComplete: result.data.complete,
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

  getStageStepBuffers(stageId: string) {
    let stepsBuffersCopy = new Map<string, StepLogBufferInfo>();
    let i = this.state.steps.length;
    while (i--) {
      let step = this.state.steps[i];
      if (step.stageId == stageId) {
        // Remove step buffer from local copy - can only have one parent.
        // This should reduce the total number of loops required.
        let stepBuffer = this.state.stepBuffers.get(step.id);
        if (stepBuffer !== undefined) {
          stepsBuffersCopy.set(step.id, stepBuffer);
        }
      }
    }
    return stepsBuffersCopy;
  }

  getConsoleTextOffset(
    stepId: string,
    startByte: number
  ): Promise<ConsoleLogData> {
    return fetch(`consoleOutput?nodeId=${stepId}&startByte=${startByte}`)
      .then((res) => res.json())
      .then((res) => {
        //console.log(`'stepId': '${stepId}', 'startByte': '${startByte}', 'res': ${JSON.stringify(res)}`)
        // Strip trailing whitespace.
        res.data.text = res.data.text.replace(/\s+$/, "");
        res.data.stepId = stepId;
        return res.data;
      })
      .catch((reason) => {
        console.error(`Caught error when fetching console: '${reason}'`);
      });
  }

  selectNode() {
    if (this.state.selectedStage) {
      return;
    }
    console.debug(`In selectNode.`);
    let params = new URLSearchParams(document.location.search.substring(1));
    let selectedStage = params.get("selected-node") || "";
    let startByte = parseInt(
      params.get("start-byte") || `${0 - LOG_FETCH_SIZE}`
    );
    let expandedSteps = [] as string[];
    let expandedStages = [] as string[];
    if (selectedStage) {
      // If we were told what node was selected find then expand it (and it's parents).
      console.debug(`Node '${selectedStage}' selected.`);
      let step = this.getStepWithId(selectedStage, this.state.steps);
      if (step) {
        console.debug(`Found step with id '${selectedStage}`);
        selectedStage = step.stageId;
        expandedSteps = [step.id];
        expandedStages = this.getStageNodeHierarchy(
          step.stageId,
          this.state.stages
        );
        this.updateStepConsole(step.id, false);
      } else {
        console.debug(
          `Didn't find step with id '${selectedStage}', must be a stage.`
        );
        expandedStages = this.getStageNodeHierarchy(
          selectedStage,
          this.state.stages
        );
      }
    } else {
      // If we weren't told what steps to expand, expand some steps by default (e.g.first failed steps).
      let step = this.getDefaultSelectedStep(this.state.steps);
      if (step) {
        console.debug(`Expanding default steps '${selectedStage}`);
        selectedStage = String(step.stageId);
        expandedSteps = [step.id];
        expandedStages = this.getStageNodeHierarchy(
          step.stageId,
          this.state.stages
        );
        this.updateStepConsoleOffset(step.id, false, startByte);
      } else {
        console.debug("No node selected.");
      }
    }
    console.debug(`Updating expandedStages to: ${expandedStages}`);
    console.debug(`Updating expandedSteps to: ${expandedSteps}`);
    this.setState({
      selectedStage: selectedStage,
      expandedSteps: expandedSteps,
      expandedStages: expandedStages,
    });
  }

  componentDidUpdate() {
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
    this.setState({ selectedStage: nodeId });
  }

  handleToggle(event: React.ChangeEvent<{}>, nodeIds: string[]): void {
    this.setState({
      expandedStages: nodeIds,
    });
  }

  updateStepConsole(stepId: string, forceUpdate: boolean) {
    this.updateStepConsoleOffset(stepId, forceUpdate, 0 - LOG_FETCH_SIZE);
  }

  updateStepConsoleOffset(
    stepId: string,
    forceUpdate: boolean,
    startByte: number
  ) {
    let stepBuffer =
      this.state.stepBuffers.get(stepId) ??
      ({
        consoleLines: [] as string[],
        consoleStartByte: 0 - LOG_FETCH_SIZE,
        consoleEndByte: -1,
        stepId: stepId,
      } as StepLogBufferInfo);
    if (stepBuffer.consoleStartByte < 0 || forceUpdate) {
      let promise = this.getConsoleTextOffset(stepId, startByte);
      promise.then((res) => {
        let newLogLines = res.text.trim().split("\n") || [];
        // Check if we are requesting a log update. 'startByte > 0' is because the first update normally requests a negative log offset.
        if (stepBuffer.consoleEndByte <= startByte && startByte > 0) {
          if (stepBuffer.consoleEndByte < startByte) {
            console.warn(
              `Log update requested, but there will be a gap of '${
                startByte - stepBuffer.consoleEndByte
              }'B in logs.`
            );
          }
          if (newLogLines.length > 0) {
            stepBuffer.consoleLines = [
              ...stepBuffer.consoleLines,
              ...newLogLines,
            ];
          }
        } else {
          // If we are not appending, we are replacing. The Jenkins don't have a stopByte (just a start byte) so we will get all of the logs.
          stepBuffer.consoleLines = newLogLines;
          // Only update start byte of we requested something before the only startByte.
          stepBuffer.consoleStartByte = res.startByte;
        }
        stepBuffer.consoleEndByte = res.endByte;
        this.state.stepBuffers.set(stepId, stepBuffer);
      });
    } else {
      console.debug(
        `Skipping update of console text for step ${stepId} - already set.`
      );
    }
  }

  handleStepToggle(event: React.SyntheticEvent<{}>, nodeId: string): void {
    let expandedSteps = [...this.state.expandedSteps];
    console.info(`Checking if '${nodeId}' in expanded list ${expandedSteps}`);
    if (!expandedSteps.includes(nodeId)) {
      console.info(`Step '${nodeId}' not in expanded list ${expandedSteps}`);
      expandedSteps.push(nodeId);
      this.updateStepConsole(nodeId, false);
    } else {
      console.info(`Step '${nodeId}' collapsed`);
      // Step untoggled.
      expandedSteps = expandedSteps.filter((v) => v !== nodeId);
    }
    console.debug(`Setting 'expandedSteps' to ${expandedSteps}`);
    this.setState({
      expandedSteps: expandedSteps,
    });
  }

  handleMoreConsoleClick(nodeId: string, startByte: number): void {
    this.updateStepConsoleOffset(nodeId, true, startByte);
  }

  // Gets the step with the given id (or none if not selected).
  getStepWithId(nodeId: string, steps: StepInfo[]) {
    let foundStep = steps.find((step) => step.id == nodeId);
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
        // Found the node, so start a list of expandedStage nodes - it will be this and it's ancestors.
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
    if (this.state.selectedStage) {
      let selectedStage = this.getStageFromList(
        this.state.stages,
        this.state.selectedStage
      );
      if (selectedStage) {
        return selectedStage;
      }
      console.debug(`Couldn't find stage '${this.state.selectedStage}'`);
    }
    return null;
  }

  getStageFromList(stages: StageInfo[], nodeId: String): StageInfo | null {
    for (let stage of stages) {
      if (stage.id == parseInt(this.state.selectedStage)) {
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
    return (
      <React.Fragment>
        <div className="App">
          <SplitPane
            // initialSize ratio
            initialSizes={[3, 7]}
            // minSize in Pixels (for all panes)
            minSizes={250}
            className="split-pane"
            split="vertical"
          >
            <div className="split-pane" key="tree-view" id="tree-view-pane">
              <Suspense fallback={<CircularProgress />}>
                <DataTreeView
                  onNodeSelect={this.handleActionNodeSelect}
                  onNodeToggle={this.handleToggle}
                  selected={this.state.selectedStage}
                  expanded={this.state.expandedStages}
                  stages={this.state.stages}
                />
              </Suspense>
            </div>

            <div
              className="split-pane split-pane--stage-view"
              key="stage-view"
              id="stage-view-pane"
            >
              <Suspense fallback={<CircularProgress />}>
                <StageView
                  stage={this.getSelectedStage()}
                  steps={this.getStageSteps(this.state.selectedStage)}
                  stepBuffers={this.getStageStepBuffers(
                    this.state.selectedStage
                  )}
                  expandedSteps={this.state.expandedSteps}
                  selectedStage={this.state.selectedStage}
                  handleStepToggle={this.handleStepToggle}
                  handleMoreConsoleClick={this.handleMoreConsoleClick}
                  scrollParentId="stage-view-pane"
                />
              </Suspense>
            </div>
          </SplitPane>
        </div>
      </React.Fragment>
    );
  }

  getConsoleStream() {
    if (this.state.steps && this.state.steps.length > 0) {
      let stepId = this.state.steps[0].id;
      let stepBuffer = this.state.stepBuffers.get(stepId);
      if (!stepBuffer) {
        stepBuffer = {
          consoleEndByte: 0,
          consoleStartByte: 0 - LOG_FETCH_SIZE,
          stepId: stepId,
          consoleLines: [],
        } as StepLogBufferInfo;
      }
      return (
        <ConsoleLogStream
          logBuffer={stepBuffer}
          handleMoreConsoleClick={this.handleMoreConsoleClick}
          scrollParentId="scroll-parent"
          stepId={stepId}
          key={`console-log-${stepId}`}
        />
      );
    } else {
      return <div>Placeholder...</div>;
    }
  }

  zzrender() {
    return (
      <React.Fragment>
        <div id="scroll-parent">{this.getConsoleStream()}</div>
      </React.Fragment>
    );
  }
}
