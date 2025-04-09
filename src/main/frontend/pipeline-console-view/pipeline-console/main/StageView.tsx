import React from "react";
import Typography from "@mui/material/Typography";

import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import InfoIcon from "@mui/icons-material/Info";
import LinkIcon from "@mui/icons-material/Link";
import ComputerIcon from "@mui/icons-material/Computer";

import {
  StepInfo,
  StageInfo,
  StepLogBufferInfo,
  LOG_FETCH_SIZE,
} from "./PipelineConsoleModel";
import StageNodeLink from "./StageNodeLink";
import ConsoleLogCard from "./ConsoleLogCard";

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
        {props.stage.startTimeMillis && (
          <ScheduleIcon
            className="detail-icon"
            key={`stage-detail-start-time-icon-${props.stage.id}`}
          />
        )}
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
      {props.stage.agent && (
        <div
          className="detail-element"
          key={`stage-detail-agent-container-${props.stage.id}`}
        >
          <ComputerIcon
            className="detail-icon"
            key={`stage-detail-agent-icon-${props.stage.id}`}
          />
          <span key={`stage-detail-agent-text-${props.stage.id}`}>
            <StageNodeLink agent={props.stage.agent} />
          </span>
        </div>
      )}
      {props.failedSteps.map((value: StepInfo) => {
        console.debug(`Found failed step ${value}`);
        return (
          <FailedStepLink
            step={value}
            key={`stage-detail-failed-step-link-${props.stage.id}-${value.id}`}
          />
        );
      })}
      <div className="detail-element">
        <LinkIcon className="detail-icon" />
        <a className="detail-element" href={`log?nodeId=${props.stage.id}`}>
          View as plain text
        </a>
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

export interface StageViewProps {
  stage: StageInfo | null;
  steps: Array<StepInfo>;
  stepBuffers: Map<string, StepLogBufferInfo>;
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
      for (let step of this.props.steps) {
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
    return stepsItems.map((stepItemData, index) => {
      return (
        <ConsoleLogCard
          step={stepItemData}
          stepBuffer={
            this.props.stepBuffers.get(stepItemData.id) ??
            ({
              lines: [] as string[],
              startByte: 0 - LOG_FETCH_SIZE,
              endByte: -1,
            } as StepLogBufferInfo)
          }
          handleStepToggle={this.props.handleStepToggle}
          isExpanded={this.props.expandedSteps.includes(stepItemData.id)}
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
        {/*<div*/}
        {/*  key={`stage-summary-${*/}
        {/*    this.props.stage ? this.props.stage.id : "unk"*/}
        {/*  }`}*/}
        {/*>*/}
        {/*  {this.renderStageDetails()}*/}
        {/*</div>*/}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            border: "var(--jenkins-border)",
            background: "var(--card-background)",
            borderRadius: "var(--form-input-border-radius)",
            padding: "0.375rem",
          }}
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
