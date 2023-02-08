
import Typography from "@mui/material/Typography";

import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import InfoIcon from "@mui/icons-material/Info";
import LinkIcon from "@mui/icons-material/Link";
import { StepInfo } from "./DataTreeView";

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


// Console output line
const ConsoleLine = (props: ConsoleLineProps) => (
  <div className="console-output-item" key={props.lineNumber}>
    <div
      className="console-output-line-anchor"
      id={`log-${props.lineNumber}`}
      key={`${props.lineNumber}-anchor`}
    />
    <div className="console-output-line" key={`${props.lineNumber}-body`}>
      <a
        className="console-line-number"
        href={`?selected-node=${props.stepId}#log-${props.lineNumber}`}
      >
        {props.lineNumber}
      </a>
      {makeReactChildren(
        tokenizeANSIString(props.content),
        `${props.stepId}-${props.lineNumber}`
      )}
    </div>
  </div>
);

interface StageViewProps {
  stage: StageInfo;
  steps: Array<StageInfo>;
}

export class StageView extends React.Component {
  props!: StageViewProps;

  constructor(props: StageViewProps) {
    super(props);
  }
  renderStageDetails() {
    let focusedStage = null;
    if (this.props.stage) {
      let failedSteps = [] as StepInfo[];
      for (let i = 0; i < this.props.steps.length; i++) {
        let step = this.props.steps[i];
        if (step.stageId === this.props.stage.selected) {
          // We seem to get a mix of upper and lower case states, so normalise on lowercase.
          if (step.state.toLowerCase() === "unstable") {
            failedSteps.push(step);
          }
        }
      }
      return (
        <pre className="console-output">
          <StageSummary stage={focusedStage} failedSteps={failedSteps} />
        </pre>
      );
    }
    return null;
  }

  renderStepDetails() {
    for (let i = 0; i < this.props.steps.length; i++) {
      let step = this.props.steps[i];
      if ("" + step.id == this.props.selected) {
        return (
          <pre className="console-output">
            <StepSummary step={step} />
          </pre>
        );
      }
    }
    return null;
  }

  renderConsoleOutput() {
    if (this.props.consoleText.length > 0) {
      const lineChunks = this.props.consoleText.split("\n");
      return (
        <pre className="console-output">
          {lineChunks.map((line, index) => {
            let lineNumber = String(index + 1);
            return (
              <ConsoleLine
                content={line}
                lineNumber={lineNumber}
                stepId={this.props.selected}
                key={`${this.props.selected}-${lineNumber}`}
              />
            );
          })}
        </pre>
      );
    } else {
      return null;
    }
  }
  render() {
    {this.renderStageDetails()}
    {this.renderStepDetails()}
    {this.renderConsoleOutput()}
  }
}