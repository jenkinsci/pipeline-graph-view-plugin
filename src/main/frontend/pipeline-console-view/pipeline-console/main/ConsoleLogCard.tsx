import React from "react";
import { lazy, Suspense } from "react";
import {
  Button,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import './console-log-card.scss';

import {
  LOG_FETCH_SIZE,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel";
import ConsoleLogModal from "./ConsoleLogModal";
import ResizeIcon from "./ResizeIcon";

import { getStepStatus } from "../../../step-status/StepStatus";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream"));

export class ConsoleLogCard extends React.Component<
  ConsoleLogCardProps,
  ConsoleLogCardState
> {
  constructor(props: ConsoleLogCardProps) {
    super(props);
    this.handleStepToggle = this.handleStepToggle.bind(this);

    this.state = {
      open: false,
    };
  }

  handleStepToggle(event: React.MouseEvent<HTMLElement>) {
    this.props.handleStepToggle(event, this.props.step.id);
  }

  componentDidMount(): void {
    if (this.props.isExpanded) {
      // If we start expanded then request logs.
      this.props.handleMoreConsoleClick(
        this.props.step.id,
        this.props.stepBuffer.startByte,
      );
    }
  }

  getTruncatedLogWarning() {
    if (this.props.stepBuffer.lines && this.props.stepBuffer.startByte > 0) {
      return (
        <Grid container>
          <Grid item xs={6} sm className="show-more-console">
            <Typography align="right" className="step-header">
              {`Missing ${this.prettySizeString(
                this.props.stepBuffer.startByte,
              )} of logs.`}
            </Typography>
          </Grid>
          <Grid item xs={6} sm className="show-more-console">
            <Button
              variant="text"
              sx={{
                padding: "0px",
                textTransform: "none",
                marginLeft: "0.25rem",
              }}
              onClick={() => {
                let startByte =
                  this.props.stepBuffer.startByte - LOG_FETCH_SIZE;
                console.debug(
                  `startByte '${this.props.stepBuffer.startByte}' -> '${startByte}'`,
                );
                if (startByte < 0) {
                  startByte = 0;
                }
                this.props.handleMoreConsoleClick(
                  this.props.step.id,
                  startByte,
                );
              }}
            >
              Show more logs
            </Button>
          </Grid>
        </Grid>
      );
    } else {
      <div></div>;
    }
  }

  prettySizeString(size: number) {
    let kib = 1024;
    let mib = 1024 * 1024;
    let gib = 1024 * 1024 * 1024;
    if (size < kib) {
      return `${size}B`;
    } else if (size < mib) {
      return `${(size / kib).toFixed(2)}KiB`;
    } else if (size < gib) {
      return `${(size / mib).toFixed(2)}MiB`;
    }
    return `${(size / gib).toFixed(2)}GiB`;
  }

  render() {
    const handleOpen = () => this.setState({ open: true });
    const handleClose = () => this.setState({ open: false });

    const statusIcon = getStepStatus(
      this.props.step.state,
      this.props.step.completePercent,
      10,
    );

    return (
      <div
        className="step-detail-group"
        key={`step-card-${this.props.step.id}`}
      >
        <button
          onClick={this.handleStepToggle}
          className="step-detail-header jenkins-button jenkins-button--tertiary"
          // onClick={this.handleStepToggle}
          // aria-label="Show console log."
          // className={`step-header step-header-${this.props.step.state.toLowerCase()} step-detail-group-${
          //   this.props.isExpanded ? "expanded" : "collapsed"
          //*}`}*/}
          key={`step-action-area-${this.props.step.id}`}
        >
          <div
            className="thinggg"
          >
            {statusIcon}

            <span style={{ fontWeight: "450" }}>
              {this.props.step.name}
            </span>

            <span style={{ color: "var(--text-color-secondary)", fontFamily: "var(--font-family-mono)" }}>{this.props.step.title}</span>
          </div>

          <div className={"actionsss"}>
            <span style={{ color: "var(--text-color-secondary)", fontFamily: "var(--font-family-mono)" }}>
              {this.props.step.totalDurationMillis.substring(
                this.props.step.totalDurationMillis.indexOf(" ") + 1,
                this.props.step.totalDurationMillis.length,
              )}
            </span>
            {/*<Tooltip title="Open console log in full-screen mode">*/}
            {/*<button*/}
            {/*  className="jenkins-button jenkins-button--tertiary"*/}
            {/*  aria-label={"Open console log in full-screen mode"}*/}
            {/*  onClick={handleOpen}*/}
            {/*>*/}
            {/*  <ResizeIcon />*/}
            {/*</button>*/}
            {/*</Tooltip>*/}
            {/*<Tooltip title="View step as plain text">*/}
            {/*<button*/}
            {/*  className="jenkins-button jenkins-button--tertiary"*/}
            {/*  onClick={() => window.open(`log?nodeId=${this.props.step.id}`)}*/}
            {/*  aria-label="View step as plain text"*/}
            {/*>*/}
            {/*  <LinkIcon />*/}
            {/*</button>*/}
            {/*</Tooltip>*/}

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={"svgtest"}>
              <path
                fill="none"
                stroke="var(--text-color-secondary)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="48"
                opacity={0.75}
                d="M184 112l144 144-144 144"
              />
            </svg>
          </div>
        </button>

        <ConsoleLogModal
          logBuffer={this.props.stepBuffer}
          handleMoreConsoleClick={this.props.handleMoreConsoleClick}
          step={this.props.step}
          truncatedLogWarning={this.getTruncatedLogWarning()}
          maxHeightScale={0.85}
          open={this.state.open}
          setClose={handleClose}
        />

        {this.props.isExpanded && (
          <div style={{ padding: "0.5rem" }}>
            <div>{this.getTruncatedLogWarning()}</div>
            <Suspense fallback={<CircularProgress />}>
              <ConsoleLogStream
                logBuffer={this.props.stepBuffer}
                handleMoreConsoleClick={this.props.handleMoreConsoleClick}
                step={this.props.step}
                maxHeightScale={0.65}
              />
            </Suspense>
          </div>
        )}
      </div>
    );
  }
}

declare module "react-tippy" {
  export interface TooltipProps {
    children?: React.ReactNode;
  }
}

export type ConsoleLogCardProps = {
  step: StepInfo;
  stepBuffer: StepLogBufferInfo;
  isExpanded: boolean;
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  // Id of the element whose scroll bar we wish to use.
  scrollParentId: string;
};

export type ConsoleLogCardState = {
  open: boolean;
};
