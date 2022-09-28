import React from "react";

import SplitPane from "react-split-pane";
import { DataTreeView } from "./DataTreeView";
import { makeReactChildren, tokenizeANSIString } from "./Ansi";
import { Linkify } from "./Linkify";
import { StageInfo } from "../../../pipeline-graph-view/pipeline-graph/main/";
import { StepInfo } from "./DataTreeView";

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

export interface ConsoleLineProps {
  lineNumber: string;
  content: (string | JSX.Element)[];
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
      {props.content.map((element, i) => {
        return React.createElement(
          Linkify,
          {
            options: { className: "line ansi-color" },
            key: `${props.lineNumber}-${i}`,
          },
          element
        );
      })}
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
        .then((res) => {
          if (res.ok) {
            return res.text();
          }
          return "";
        })
        .then((text) => {
          console.debug("Updating consoleText");
          this.setState({
            // Strip trailing whitespace.
            consoleText: text.replace(/\s+$/, ""),
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
      console.log(`Checking node id ${stage.id}`);
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

  render() {
    const splitPaneStyle: React.CSSProperties = {
      position: "relative",
      height: "100%",
    };
    const paneStyle: React.CSSProperties = {
      paddingLeft: "8px",
      textAlign: "left",
    };

    const lineChunks = this.state.consoleText
      .split("\n")
      .map(tokenizeANSIString)
      .map(makeReactChildren);

    return (
      <React.Fragment>
        <div className="App">
          <SplitPane
            split="vertical"
            minSize={150}
            defaultSize={parseInt(localStorage.getItem("splitPos") || "250")}
            onChange={(size) => localStorage.setItem("splitPos", `${size}`)}
            style={splitPaneStyle}
          >
            <div style={paneStyle}>
              <DataTreeView
                onNodeSelect={this.handleActionNodeSelect}
                onNodeToggle={this.handleToggle}
                selected={this.state.selected}
                expanded={this.state.expanded}
                stages={this.state.stages}
                steps={this.state.steps}
              />
            </div>
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
          </SplitPane>
        </div>
      </React.Fragment>
    );
  }
}
