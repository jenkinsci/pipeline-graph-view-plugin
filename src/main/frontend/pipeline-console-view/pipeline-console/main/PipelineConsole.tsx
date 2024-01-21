import React from "react";
import { lazy, Suspense } from "react";
import { SplitPane } from "react-collapse-pane";

import {
  LOG_FETCH_SIZE,
  StepLogBufferInfo,
  getRunStatus,
  getRunSteps,
  getConsoleTextOffset,
  POLL_INTERVAL,
  pollUntilComplete,
  RunStatus,
} from "./PipelineConsoleModel";
import { CircularProgress } from "@mui/material";

import "./pipeline-console.scss";
import { StageInfo, StepInfo, Result } from "./PipelineConsoleModel";
import Button from "@mui/material/Button";

const DataTreeView = lazy(() => import("./DataTreeView"));
const StageView = lazy(() => import("./StageView"));

interface PipelineStatusInfo extends RunStatus {
  steps: StepInfo[];
}

interface PipelineConsoleProps {}

interface PipelineConsoleState {
  selectedStage: string;
  openStage: string;
  expandedStages: string[];
  expandedSteps: string[];
  stages: Array<StageInfo>;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
  anchor: string;
  hasScrolled: boolean;
  isComplete: boolean;
  hasUnmounted: boolean;
}

// Determines the default selected step.
export const getDefaultSelectedStep = (steps: StepInfo[]) => {
  let selectedStep = steps.find((step) => step !== undefined);
  if (!steps || steps.length == 0 || !selectedStep) {
    return null;
  }
  for (let step of steps) {
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
        if (selectedStepResult && stepResult < selectedStepResult) {
          // Return first unstable/failed/aborted step which has a state worse than the selectedStep.
          // E.g. if the first step state is failure we want to return that over a later unstable step.
          return step;
        }
        continue;
      default:
        // Otherwise select the step with the worst result with the largest id - e.g. (last step if all successful).
        if (selectedStepResult && stepResult <= selectedStepResult) {
          selectedStep = step;
        }
    }
  }
  return selectedStep;
};

export const updateStepBuffer = (
  stepId: string,
  startByte: number,
  stepBuffer: StepLogBufferInfo
): StepLogBufferInfo => {
  getConsoleTextOffset(stepId, startByte).then((response) => {
    if (!response) {
      console.warn(`Skipping update of console text as client returned null.`);
      return;
    }
    let newLogLines = response.text.trim().split("\n") || [];
    // Check if we are requesting a log update - 'endByte' should only be negative when on the first call.
    if (stepBuffer.endByte > 0 && stepBuffer.endByte <= startByte) {
      if (stepBuffer.endByte < startByte) {
        console.warn(
          `Log update requested, but there will be a gap of '${
            startByte - stepBuffer.endByte
          }'B in logs.`
        );
      }
      if (newLogLines.length > 0) {
        stepBuffer.lines = [...stepBuffer.lines, ...newLogLines];
      }
    } else {
      // If we are not appending, we are replacing. The Jenkins don't have a stopByte (just a start byte) so we will get all of the logs.
      stepBuffer.lines = newLogLines;
      // Only update start byte of we requested something before the only startByte.
      stepBuffer.startByte = response.startByte;
    }
    stepBuffer.endByte = response.endByte;
  });
  return stepBuffer;
};

export default class PipelineConsole extends React.Component<
  PipelineConsoleProps,
  PipelineConsoleState
> {
  constructor(props: PipelineConsoleProps) {
    super(props);
    this.handleStageSelect = this.handleStageSelect.bind(this);
    this.handleStageToggle = this.handleStageToggle.bind(this);
    this.handleStepToggle = this.handleStepToggle.bind(this);
    this.handleMoreConsoleClick = this.handleMoreConsoleClick.bind(this);

    // set default values of state
    this.state = {
      // Store the stage that is selected - either by the user or URL params.
      selectedStage: "",
      // Store the stage that should be open in the stage view.
      openStage: "",
      expandedStages: [] as string[],
      expandedSteps: [] as string[],
      stages: [] as StageInfo[],
      steps: [] as StepInfo[],
      stepBuffers: new Map<string, StepLogBufferInfo>(),
      anchor: window.location.hash.replace("#", ""),
      hasScrolled: false,
      isComplete: false,
      hasUnmounted: false,
    };
  }

  // State update methods
  async getStateUpdate(): Promise<PipelineStatusInfo> {
    // Call functions in parallel.
    const updateStages = async () => {
      return await getRunStatus();
    };
    const updateSteps = async () => {
      return await getRunSteps();
    };
    let stages = await updateStages();
    let steps = await updateSteps();
    return {
      // Default 'isComplete' to false and 'stages' to empty array incase 'updateStages' returns null.
      ...(stages ?? { isComplete: false, stages: [] }),
      ...(steps ?? { steps: [] }),
    } as PipelineStatusInfo;
  }

  setStagesAndSteps(newStatus: PipelineStatusInfo) {
    this.setState(
      (prevState) => {
        return {
          ...prevState,
          ...newStatus,
        };
      },
      () => {
        this.followPipeline();
      }
    );
  }

  // Trigger poller when component mounts.
  componentDidMount(): void {
    // First time setup.
    this.getStateUpdate().then((newState) => {
      this.setState(
        (prevState) => {
          return {
            ...prevState,
            ...newState,
          };
        },
        () => {
          // Handle any URL params.
          if (!this.parseUrlParams()) {
            // If we weren't told want node to select, select a default node.
            this.selectDefaultNode();
          }
          if (!this.state.isComplete) {
            // Setup poller to update stages.
            this.pollForUpdates();
          }
        }
      );
    });
  }

  // Stop poller from running.
  componentWillUnmount(): void {
    this.setState((prevState) => {
      return {
        ...prevState,
        hasUnmounted: true,
      };
    });
  }

  pollForUpdates() {
    // Setup poller to update stages and steps.
    pollUntilComplete<PipelineStatusInfo>({
      functionToPoll: () => {
        return this.getStateUpdate();
      },
      checkSuccess: (data: PipelineStatusInfo) => {
        return data ? true : false;
      },
      onSuccess: (data: PipelineStatusInfo) => {
        this.setStagesAndSteps(data);
      },
      checkComplete: (data: PipelineStatusInfo) => {
        // Set 'checkComplete' when component unmounted to prevent needless polling.
        return (data.isComplete ?? false) || this.state.hasUnmounted;
      },
      onComplete: () => {
        this.onPipelineComplete();
      },
      interval: 1000,
    });
  }

  onPipelineComplete() {
    console.debug("Pipeline completed.");
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

  parseUrlParams(): boolean {
    let params = new URLSearchParams(document.location.search.substring(1));
    let selectedStage = params.get("selected-node") || "";
    // If we were told what node was selected find and then expand it (and it's parents).
    if (selectedStage) {
      let startByte = parseInt(
        params.get("start-byte") || `${0 - LOG_FETCH_SIZE}`
      );
      let expandedSteps = [] as string[];
      let expandedStages = [] as string[];
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
        this.updateStepConsoleOffset(step.id, false, startByte);
      } else {
        console.debug(
          `Didn't find step with id '${selectedStage}', must be a stage.`
        );
        expandedStages = this.getStageNodeHierarchy(
          selectedStage,
          this.state.stages
        );
      }
      this.setState({
        openStage: selectedStage,
        selectedStage: selectedStage,
        expandedSteps: expandedSteps,
        expandedStages: expandedStages,
      });
      return true;
    }
    return false;
  }

  selectDefaultNode() {
    let selectedStage = "";
    let openStage = "";
    let expandedSteps = [] as string[];
    let expandedStages = [] as string[];
    // If we weren't told what to expand, expand a step by default (e.g. first failed step).
    let step = getDefaultSelectedStep(this.state.steps);
    if (step) {
      if (!this.state.isComplete) {
        // Set 'selectedStage' to empty string, so we follow the running Pipeline.
        selectedStage = "";
      } else {
        // The Pipeline is finish, so we don't need to follow it.
        selectedStage = step.stageId;
      }
      // Always open this step's stage.
      openStage = step.stageId;
      expandedSteps = [step.id];
      expandedStages = this.getStageNodeHierarchy(
        step.stageId,
        this.state.stages
      );
      this.setState({
        openStage: openStage,
        selectedStage: selectedStage,
        expandedSteps: expandedSteps,
        expandedStages: expandedStages,
      });
      document
        .getElementById(`stage-tree-icon-${this.state.selectedStage}`)
        ?.scrollIntoView();
    } else {
      console.debug("No node selected.");
    }
  }

  followPipeline() {
    if (this.state.selectedStage == "") {
      this.selectDefaultNode();
    }
  }

  /* Event handlers */
  handleStageSelect(event: React.ChangeEvent<any>, nodeId: string) {
    if (!nodeId) {
      console.debug("");
      return;
    }
    console.log(`Node '${nodeId}' selected.`);
    let steps = this.getStageSteps(nodeId);
    let newlyExpandedSteps = [] as string[];
    if (steps.length > 0) {
      // Expand last step in newly focused stage.
      newlyExpandedSteps = [steps[steps.length - 1].id];
    }
    this.setState((prevState) => {
      return {
        ...prevState,
        openStage: nodeId,
        // Allow user to toggle the selected node to start following the running Pipeline.
        // If the node is expanded make sure it is selected.
        selectedStage:
          prevState.selectedStage == nodeId &&
          !prevState.expandedStages.includes(nodeId)
            ? ""
            : nodeId,
        expandedSteps: [...prevState.expandedSteps, ...newlyExpandedSteps],
      };
    });
    if (this.state.selectedStage != "") {
      // Update newly expanded step console for expanded step - as the expand button wasn't triggered it won't trigger the 'handleStepToggle'.
      // This fixes the highlighting of already expanded nodes.
      this.updateStepConsole(newlyExpandedSteps[0], false);
    }
  }

  handleStageToggle(event: React.ChangeEvent<{}>, nodeIds: string[]): void {
    this.setState((prevState) => {
      return {
        expandedStages: nodeIds,
      };
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
        lines: [] as string[],
        startByte: 0 - LOG_FETCH_SIZE,
        endByte: -1,
        stepId: stepId,
      } as StepLogBufferInfo);
    if (stepBuffer.startByte > 0 && !forceUpdate) {
      console.debug(
        `Skipping update of console text for step ${stepId} - already set.`
      );
      return;
    }
    stepBuffer = updateStepBuffer(stepId, startByte, stepBuffer) ?? stepBuffer;
    let stepBuffersCopy = new Map(this.state.stepBuffers);
    stepBuffersCopy.set(stepId, stepBuffer);
    this.setState((prevState) => {
      return {
        ...prevState,
        stepBuffers: stepBuffersCopy,
      };
    });
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
      // Step un-toggled.
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
    for (let stage of stages) {
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

  getOpenStage(): StageInfo | null {
    if (this.state.openStage) {
      let openStage = this.getStageFromList(
        this.state.stages,
        this.state.openStage
      );
      if (openStage) {
        return openStage;
      }
      console.debug(`Couldn't find open stage '${this.state.openStage}'`);
    }
    return null;
  }

  getStageFromList(stages: StageInfo[], nodeId: string): StageInfo | null {
    for (let stage of stages) {
      if (stage.id == parseInt(nodeId)) {
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
    const buttonPositionOffset = 10;
    const collapseDirection = "left";
    const collapseTransition = 500;
    const grabberSize = 10;
    const buttonTransition = "grow";

    return (
      <React.Fragment>
        <div className="App">
          <SplitPane
            // initialSize ratio
            initialSizes={[2, 8]}
            // minSize in Pixels (for all panes)
            minSizes={250}
            className="split-pane"
            split="vertical"
            collapse={{
              collapseTransitionTimeout: collapseTransition,
              buttonTransition,
              collapseDirection,
              buttonPositionOffset,
            }}
            resizerOptions={{
              grabberSize,
            }}
          >
            <div className="split-pane" key="tree-view" id="tree-view-pane">
              <Suspense fallback={<CircularProgress />}>
                <DataTreeView
                  onNodeToggle={this.handleStageToggle}
                  onNodeSelect={this.handleStageSelect}
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
                  stage={this.getOpenStage()}
                  steps={this.getStageSteps(this.state.openStage)}
                  stepBuffers={this.getStageStepBuffers(this.state.openStage)}
                  expandedSteps={this.state.expandedSteps}
                  selectedStage={this.state.openStage}
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
}
