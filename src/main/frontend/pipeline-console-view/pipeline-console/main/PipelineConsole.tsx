import React from "react";

import { SplitPane } from "react-collapse-pane";
import { makeReactChildren, tokenizeANSIString } from "./Ansi";
import { StageInfo } from "../../../pipeline-graph-view/pipeline-graph/main/";
import { DataTreeView, StepInfo } from "./DataTreeView";

import Typography from '@mui/material/Typography';

import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TimerIcon from '@mui/icons-material/Timer';
import InfoIcon from '@mui/icons-material/Info';
import LinkIcon from '@mui/icons-material/Link';

import "./pipeline-console.scss";

interface PipelineConsoleProps {}
interface PipelineConsoleState {
  consoleText: string;
  selected: string;
  expanded: string[];
  stages: Array<StageInfo>;
  steps: Array<StepInfo>;
  anchor: string;
  hasScrolled: boolean;
}

export interface StageSummaryProps {
  stage: StageInfo;
  failedSteps: StepInfo[];
}

// Tree Item for stages
const StageSummary = (props: StageSummaryProps) => (
  <React.Fragment>
    <div className="stage-detail-group">
      <Typography color="inherit" className="detail-element-header">
        Stage '{props.stage.name}'
      </Typography>
      <div className="detail-element" key="start-time">
        <ScheduleIcon className="detail-icon" />
        {props.stage.startTimeMillis}
      </div>
      <div className="detail-element" key="paused-duration">
        <HourglassEmptyIcon className="detail-icon" />
        {props.stage.pauseDurationMillis}
      </div>
      <div className="detail-element" key="duration">
        <TimerIcon className="detail-icon" />
        {props.stage.totalDurationMillis}
      </div>
      <div className="detail-element" key="status">
        <InfoIcon className="detail-icon " />
        <span className="capitalize">{props.stage.state}</span>
      </div>
      {props.failedSteps.map((value: StepInfo) => {
        console.log(`Found failed step ${value}`);
        return (
          <FailedStepLink step={value} key={`failed-step-link-${value.id}`} />
        );
      })}
    </div>
  </React.Fragment>
);

export interface StepSummaryProps {
  step: StepInfo;
}

// Tree Item for stages
const StepSummary = (props: StepSummaryProps) => (
  <React.Fragment>
    <div className="step-detail-group">
      <div className="detail-element" key="start-time">
        <ScheduleIcon className="detail-icon" />
        {props.step.startTimeMillis}
      </div>
      <div className="detail-element" key="paused-duration">
        <HourglassEmptyIcon className="detail-icon" />
        {props.step.pauseDurationMillis}
      </div>
      <div className="detail-element" key="duration">
        <TimerIcon className="detail-icon" />
        {props.step.totalDurationMillis}
      </div>
      <div className="detail-element capitalize" key="status">
        <InfoIcon className="detail-icon" />
        <span className="capitalize">{props.step.state}</span>
      </div>
    </div>
  </React.Fragment>
);

export interface FailedStepLinkProps {
  step: StepInfo;
}

const FailedStepLink = (props: FailedStepLinkProps) => (
  <div className="detail-element">
    <LinkIcon className="detail-icon" />
    <a className="detail-element" href={`?selected-node=${props.step.id}`}>
      Failed step: {props.step.name}
    </a>
  </div>
);

export interface ConsoleLineProps {
  lineNumber: string;
  content: string;
  stepId: string;
  key: string;
}

// Tree Item for stages
const ConsoleLine = (props: ConsoleLineProps) => (
  <div className="console-output-item" key={props.lineNumber}>
    <div
      className="console-output-line-anchor"
      id={`log-${props.lineNumber}`}
    />
    <div className="console-output-line">
      <a
        className="console-line-number"
        href={`?selected-node=${props.stepId}#log-${props.lineNumber}`}
      >
        {props.lineNumber}
      </a>
      {makeReactChildren(tokenizeANSIString(props.content))}
    </div>
  </div>
);

export class PipelineConsole extends React.Component<
  PipelineConsoleProps,
  PipelineConsoleState
> {
  constructor(props: PipelineConsoleProps) {
    super(props);
    this.handleActionNodeSelect = this.handleActionNodeSelect.bind(this);
    this.handleToggle = this.handleToggle.bind(this);
    // set default values of state
    this.state = {
      // Need to update dynamically
      consoleText: "Select a node to view console output.",
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
    let stagesPromse = this.setStages();
    let stepsPromise = this.setSteps();
    // Try waiting for
    await stagesPromse;
    await stepsPromise;
    this.handleUrlParams();
  }

  setStages() {
    // Sets stages state.
    return fetch("tree")
      .then((res) => res.json())
      .then((result) => {
        console.debug("Updating stages");
        this.setState({
          stages: result.data.stages,
        });
      });
    // returns Promise
  }

  setSteps() {
    return fetch(`allSteps`)
      .then((step_res) => step_res.json())
      .then((step_result) => {
        console.debug("Updating steps");
        console.debug(JSON.stringify(step_result.data));
        this.setState({
          steps: step_result.data.steps,
        });
      })
      .catch(console.log);
  }

  setConsoleText(stepId: string) {
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
  }

  handleUrlParams() {
    console.debug(`In handleUrlParams.`);
    let params = new URLSearchParams(document.location.search.substring(1));
    let selected = params.get("selected-node") || "";
    if (selected) {
      console.debug(`Node '${selected}' selected.`);
      let expanded = [];
      let step = this.getStepWithId(selected, this.state.steps);
      if (step) {
        console.debug(`Found step with id '${selected}`);
        this.setConsoleText(String(step.id));
        selected = String(step.id);
        expanded = this.getStageNodeHierarchy(step.stageId, this.state.stages);
      } else {
        console.debug(
          `Didn't find step with id '${selected}, must be a stasge.`
        );
        expanded = this.getStageNodeHierarchy(selected, this.state.stages);
      }
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
    this.setConsoleText(nodeId);
    // If we get console response, we know that this is a step.
    this.setState({ selected: nodeId });
  }

  handleToggle(event: React.ChangeEvent<{}>, nodeIds: string[]): void {
    this.setState({
      expanded: nodeIds,
    });
  }

  // Gets the selected step in the tree view (or none if not selected).
  getStepWithId(nodeId: string, steps: StepInfo[]) {
    let foundStep = steps.find((step) => String(step.id) == nodeId);
    if (!foundStep) {
      console.debug(`No step found with nodeID ${nodeId}`);
    }
    return foundStep;
  }

  // Gets the node hierarchy of stages in the tree view (a list of child -> parent -> grandparent).#
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

  renderStageDetails() {
    let focusedStage = null;
    for (let i = 0; i < this.state.stages.length; i++) {
      let stage = this.state.stages[i];
      if ("" + stage.id == this.state.selected) {
        // User has selected a stage node.
        focusedStage = stage;
        let failedSteps = [] as StepInfo[];
        for (let i = 0; i < this.state.steps.length; i++) {
          let step = this.state.steps[i];
          if (step.stageId === this.state.selected) {
            // We seem to get a mix of upper and lower case states, so normalise on lowercase.
            if (step.state.toLowerCase() === "unstable") {
              failedSteps.push(step);
            }
          }
        }
        return (
          <div className="console-output">
            <StageSummary stage={focusedStage} failedSteps={failedSteps} />
          </div>
        );
      }
    }
    return (
      // Return empty div
      <div></div>
    );
  }

  renderStepDetails() {
    for (let i = 0; i < this.state.steps.length; i++) {
      let step = this.state.steps[i];
      if ("" + step.id == this.state.selected) {
        return (
          <div className="console-output">
            <StepSummary step={step} />
          </div>
        );
      }
    }
    return (
      // Return empty div
      <div></div>
    );
  }

  renderConsoleOutput() {
    if (this.state.consoleText.length > 0) {
      const lineChunks = this.state.consoleText.split("\n");
      return (
        <div className="console-output">
          <pre className="console-pane console-output-item">
            {lineChunks.map((line, index) => {
              let lineNumber = String(index + 1);
              return (
                <ConsoleLine
                  content={line}
                  lineNumber={lineNumber}
                  stepId={this.state.selected}
                  key={`${this.state.selected}-${lineNumber}`}
                />
              );
            })}
          </pre>
        </div>
      );
    } else {
      // Return empty div if no text.
      return <div></div>;
    }
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
            {this.renderStageDetails()}
            {this.renderStepDetails()}
            {this.renderConsoleOutput()}
          </div>
        </SplitPane>
      </div>
    </React.Fragment>
    )
  }
}
