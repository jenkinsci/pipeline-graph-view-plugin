
import React from "react";

import Typography from "@mui/material/Typography";

import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import InfoIcon from "@mui/icons-material/Info";
import LinkIcon from "@mui/icons-material/Link";

import { StepInfo } from "./DataTreeView";
import { AccordionView } from "./AccordionView"

import {
  StageInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/";

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

// Tree Item for steps
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


interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  selected: string;
  updateStepConsoleText: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
}

export class StageView extends React.Component {
  props!: StageViewProps;

  constructor(props: StageViewProps) {
    super(props);
  }
  renderStageDetails() {
    if (this.props.stage) {
      let failedSteps = [] as StepInfo[];
      for (let i = 0; i < this.props.steps.length; i++) {
        let step = this.props.steps[i];
        if (step.stageId === this.props.selected) {
          // We seem to get a mix of upper and lower case states, so normalise on lowercase.
          if (step.state.toLowerCase() === "unstable") {
            failedSteps.push(step);
          }
        }
      }
      return (
        <pre className="console-output">
          <StageSummary stage={this.props.stage} failedSteps={failedSteps} />
        </pre>
      );
    }
    return null;
  }

  render() {
    return (
      <React.Fragment>
        <div key="stage-summary">
          {this.renderStageDetails()}
        </div>
        <div key="exanding-steps">
          <AccordionView
            steps={this.props.steps}
            updateStepConsoleText={this.props.updateStepConsoleText}
          />
        </div>
      </React.Fragment>
    )
  }
}