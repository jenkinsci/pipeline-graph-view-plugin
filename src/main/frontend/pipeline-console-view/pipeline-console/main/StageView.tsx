import React from "react";
import Typography from "@mui/material/Typography";

import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import InfoIcon from "@mui/icons-material/Info";
import LinkIcon from "@mui/icons-material/Link";

import { StepInfo, StageInfo } from "./PipelineConsoleModel";
import { ConsoleLogCard } from "./ConsoleLogCard";

export interface StageSummaryProps {
  stage: StageInfo;
  failedSteps: StepInfo[];
}

// Tree Item for stages
const StageSummary = (props: StageSummaryProps) => (
  <React.Fragment>
    <div
      className="stage-detail-group"
      key={`stage-detail-root-${props.stage.id}`}
    >
      <Typography
        color="inherit"
        className="detail-element-header"
        key={`stage-detail-name-text-${props.stage.id}`}
      >
        Stage '{props.stage.name}'
      </Typography>
      <div
        className="detail-element"
        key={`stage-detail-start-time-container-${props.stage.id}`}
      >
        <ScheduleIcon
          className="detail-icon"
          key={`stage-detail-start-time-icon-${props.stage.id}`}
        />
        {props.stage.startTimeMillis}
      </div>
      <div
        className="detail-element"
        key={`stage-detail-pause-duration-container-${props.stage.id}`}
      >
        <HourglassEmptyIcon
          className="detail-icon"
          key={`stage-detail-pause-duration-icon-${props.stage.id}`}
        />
        {props.stage.pauseDurationMillis}
      </div>
      <div
        className="detail-element"
        key={`stage-detail-duration-container-${props.stage.id}`}
      >
        <TimerIcon
          className="detail-icon"
          key={`stage-detail-duration-icon-${props.stage.id}`}
        />
        {props.stage.totalDurationMillis}
      </div>
      <div
        className="detail-element"
        key={`stage-detail-status-container-${props.stage.id}`}
      >
        <InfoIcon
          className="detail-icon"
          key={`stage-detail-status-icon-${props.stage.id}`}
        />
        <span
          className="capitalize"
          key={`stage-detail-status-text-${props.stage.id}`}
        >
          {props.stage.state}
        </span>
      </div>
      {props.failedSteps.map((value: StepInfo) => {
        console.log(`Found failed step ${value}`);
        return (
          <FailedStepLink
            step={value}
            key={`stage-detail-failed-step-link-${props.stage.id}-${value.id}`}
          />
        );
      })}
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

interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  selectedStage: string;
  expandedSteps: string[];
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  // Id of the element whose scroll bar we wish to use.
  scrollParentId: string;
}

export default class StageView extends React.Component {
  props!: StageViewProps;

  constructor(props: StageViewProps) {
    super(props);
  }
  renderStageDetails() {
    if (this.props.stage) {
      let failedSteps = [] as StepInfo[];
      for (let i = 0; i < this.props.steps.length; i++) {
        let step = this.props.steps[i];
        if (step.stageId === this.props.selectedStage) {
          // We seem to get a mix of upper and lower case states, so normalise on lowercase.
          if (step.state.toLowerCase() === "unstable") {
            failedSteps.push(step);
          }
        }
      }
      return (
        <pre
          className="console-output"
          id={`console-root-${this.props.stage ? this.props.stage.id : "unk"}`}
        >
          <StageSummary stage={this.props.stage} failedSteps={failedSteps} />
        </pre>
      );
    }
    return null;
  }

  getTreeItemsFromStepList = (stepsItems: StepInfo[]) => {
    console.debug(`Passed expandedSteps: ${this.props.expandedSteps}`);
    return stepsItems.map((stepItemData) => {
      console.debug(
        `Is expanded (${stepItemData.id}): ${this.props.expandedSteps.includes(
          String(stepItemData.id)
        )}`
      );
      return (
        <ConsoleLogCard
          step={stepItemData}
          handleStepToggle={this.props.handleStepToggle}
          isExpanded={this.props.expandedSteps.includes(
            String(stepItemData.id)
          )}
          handleMoreConsoleClick={this.props.handleMoreConsoleClick}
          key={`step-console-card-${stepItemData.id}`}
          scrollParentId={this.props.scrollParentId}
        />
      );
    });
  };

  render() {
    return (
      <React.Fragment>
        <div
          key={`stage-summary-${
            this.props.stage ? this.props.stage.id : "unk"
          }`}
        >
          {this.renderStageDetails()}
        </div>
        <div
          key={`stage-steps-container-${
            this.props.stage ? this.props.stage.id : "unk"
          }`}
        >
          {this.getTreeItemsFromStepList(this.props.steps)}
        </div>
      </React.Fragment>
    );
  }
}
