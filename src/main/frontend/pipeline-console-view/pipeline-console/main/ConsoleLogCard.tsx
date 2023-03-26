import React from "react";
import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActions";

import Collapse from "@mui/material/Collapse";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { ConsoleLine } from "./ConsoleLine";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import { LOG_FETCH_SIZE } from "./PipelineConsoleModel";

import { Virtuoso } from "react-virtuoso";

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? "rotate(0deg)" : "rotate(180deg)",
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

export type ConsoleLogCardProps = {
  step: StepInfo;
  stepBuffer: StepLogBufferInfo;
  isExpanded: boolean;
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  // Id of the element whose scroll bar we wish to use.
  scrollParentId: string;
};

export class ConsoleLogCard extends React.Component<ConsoleLogCardProps> {
  constructor(props: ConsoleLogCardProps) {
    super(props);
    this.handleStepToggle = this.handleStepToggle.bind(this);
  }

  handleStepToggle(event: React.MouseEvent<HTMLElement>) {
    this.props.handleStepToggle(event, this.props.step.id);
  }

  componentDidMount() {
    // If we are passed a running expanded step, then start polling.
    if (this.props.isExpanded && this.props.step.state == "running") {
      this.pollForUpdates();
    }
  }

  componentDidUpdate(prevProps: ConsoleLogCardProps) {
    // If step has just been expanded and is running then start polling.
    if (
      !prevProps.isExpanded &&
      this.props.isExpanded &&
      this.props.step.state == "running"
    ) {
      this.pollForUpdates();
    }
  }

  pollForUpdates() {
    // Poll for updates every 1 second until the Pipeline is complete.
    // This updates the console log text, not the list of stages or steps.
    let requestedStartByte = this.props.stepBuffer.consoleStartByte;
    // If we have already logs, then only ask for logs since endByte.
    if (this.props.stepBuffer.consoleLines.length > 0) {
      requestedStartByte = this.props.stepBuffer.consoleEndByte;
    }
    this.props.handleMoreConsoleClick(this.props.step.id, requestedStartByte);
    if (this.props.step.state != "running") {
      this.onStepComplete();
    } else {
      setTimeout(() => this.pollForUpdates(), 1000);
    }
  }

  onStepComplete() {
    console.debug(
      `Step '${this.props.step.name}' (${this.props.step.id}) completed.`
    );
  }

  getTruncatedLogWarning() {
    if (
      this.props.stepBuffer.consoleLines &&
      this.props.stepBuffer.consoleStartByte > 0
    ) {
      return (
        <Grid container>
          <Grid item xs={6} sm className="show-more-console">
            <Typography align="right" className="step-header">
              {`Missing ${this.prettySizeString(
                this.props.stepBuffer.consoleStartByte
              )} of logs.`}
            </Typography>
          </Grid>
          <Grid item xs={6} sm className="show-more-console">
            <Button
              variant="text"
              sx={{ padding: "0px", textTransform: "none" }}
              onClick={() => {
                let startByte =
                  this.props.stepBuffer.consoleStartByte - LOG_FETCH_SIZE;
                console.debug(
                  `startByte '${this.props.stepBuffer.consoleStartByte}' -> '${startByte}'`
                );
                if (startByte < 0) {
                  startByte = 0;
                }
                this.props.handleMoreConsoleClick(
                  this.props.step.id,
                  startByte
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

  renderSimpleConsoleLines() {
    if (this.props.stepBuffer.consoleLines) {
      return this.props.stepBuffer.consoleLines.map(
        (content: string, index: number) => {
          return (
            <ConsoleLine
              lineNumber={String(index)}
              content={content}
              stepId={this.props.step.id}
              startByte={this.props.stepBuffer.consoleStartByte}
            />
          );
        }
      );
    } else {
      return <div></div>;
    }
  }

  renderConsoleLine(index: number) {
    if (this.props.stepBuffer.consoleLines) {
      return (
        <ConsoleLine
          lineNumber={String(index + 1)}
          content={this.props.stepBuffer.consoleLines[index]}
          stepId={this.props.step.id}
          startByte={this.props.stepBuffer.consoleStartByte}
        />
      );
    }
  }

  getNumConsoleLines() {
    return this.props.stepBuffer.consoleLines
      ? this.props.stepBuffer.consoleLines.length
      : 0;
  }

  render() {
    return (
      <Card
        className="step-detail-group"
        key={`step-card-${this.props.step.id}`}
        style={{ marginBottom: "5px" }}
      >
        <CardActionArea
          onClick={this.handleStepToggle}
          aria-label="Show console log."
          className={`step-header-${this.props.step.state.toLowerCase()} step-detail-group-${
            this.props.isExpanded ? "expanded" : "collapsed"
          }`}
          key={`step-action-area-${this.props.step.id}`}
        >
          <Grid
            container
            wrap="nowrap"
            columns={{ xs: 20 }}
            key={`step-root-container-${this.props.step.id}`}
          >
            <Grid
              item
              container
              xs={16}
              sx={{ display: "block", margin: "auto" }}
              width="80%"
            >
              <Typography
                className="log-card-header"
                noWrap={true}
                component="div"
                key={`step-name-text-${this.props.step.id}`}
                sx={{ flexGrow: 3 }}
              >
                {this.props.step.name
                  .substring(0, this.props.step.name.lastIndexOf("-"))
                  .trimEnd()}
              </Typography>
              <Typography
                className="log-card-text"
                component="div"
                key={`step-duration-text-${this.props.step.id}`}
              >
                {this.props.step.name
                  .substring(
                    this.props.step.name.lastIndexOf("-") + 1,
                    this.props.step.name.length
                  )
                  .trimStart()}
              </Typography>
            </Grid>
            <Grid
              item
              xs={2}
              sx={{ margin: "auto", padding: "0px" }}
              alignItems="center"
              justifyContent="center"
            >
              <Typography
                className="log-card-text"
                align="right"
                component="div"
                key={`step-duration-text-${this.props.step.id}`}
              >
                {this.props.step.totalDurationMillis.substring(
                  this.props.step.totalDurationMillis.indexOf(" ") + 1,
                  this.props.step.totalDurationMillis.length
                )}
              </Typography>
            </Grid>
            <Grid item xs={2} alignItems="center" sx={{ margin: "auto" }}>
              <ExpandMore
                expand={this.props.isExpanded}
                aria-expanded
                key={`step-expand-button-${this.props.step.id}`}
                sx={{ display: "block", marginLeft: "auto" }}
              >
                <ExpandMoreIcon
                  key={`step-expand-icon-${this.props.step.id}`}
                  className="svg-icon svg-icon--expand"
                />
              </ExpandMore>
            </Grid>
          </Grid>
        </CardActionArea>
        <Collapse
          in={this.props.isExpanded}
          timeout={50}
          unmountOnExit
          key={`step-colapsable-console-${this.props.step.id}`}
        >
          <CardContent
            className="step-content"
            key={`step-console-content-${this.props.step.id}`}
          >
            <div>{this.getTruncatedLogWarning()}</div>
            <Virtuoso
              totalCount={this.getNumConsoleLines()}
              itemContent={(index: number) => this.renderConsoleLine(index)}
              // This ID comes from PipelineConsole.
              // Pass in The parent split-pane element to use it's scroll base instead of a new one.
              customScrollParent={
                document.getElementById(this.props.scrollParentId) || undefined
              }
              followOutput={"auto"}
            />
          </CardContent>
        </Collapse>
      </Card>
    );
  }
}
