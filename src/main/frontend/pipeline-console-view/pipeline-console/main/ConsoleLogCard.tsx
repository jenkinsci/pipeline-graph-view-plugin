import React from "react";
import { lazy, Suspense } from "react";
import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActions";
import { CircularProgress } from "@mui/material";
import Collapse from "@mui/material/Collapse";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Tooltip } from "react-tippy";

import { LOG_FETCH_SIZE } from "./PipelineConsoleModel";
import LinkIcon from "@mui/icons-material/Link";
import ConsoleLogModal from "./ConsoleLogModal";
import ResizeIcon from "./ResizeIcon";

import { getStepStatus } from "../../../step-status/StepStatus";

const ConsoleLogStream = lazy(() => import("./ConsoleLogStream"));

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

declare module "react-tippy" {
  export interface TooltipProps {
    children?: React.ReactNode;
  }
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

export type ConsoleLogCardState = {
  open: boolean;
};

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

  getTruncatedLogWarning() {
    if (this.props.stepBuffer.lines && this.props.stepBuffer.startByte > 0) {
      return (
        <Grid container>
          <Grid item xs={6} sm className="show-more-console">
            <Typography align="right" className="step-header">
              {`Missing ${this.prettySizeString(
                this.props.stepBuffer.startByte
              )} of logs.`}
            </Typography>
          </Grid>
          <Grid item xs={6} sm className="show-more-console">
            <Button
              variant="text"
              sx={{ padding: "0px", textTransform: "none" }}
              onClick={() => {
                let startByte =
                  this.props.stepBuffer.startByte - LOG_FETCH_SIZE;
                console.debug(
                  `startByte '${this.props.stepBuffer.startByte}' -> '${startByte}'`
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

  render() {
    const handleOpen = () => this.setState({ open: true });
    const handleClose = () => this.setState({ open: false });

    const statusIcon = getStepStatus(this.props.step.state, this.props.step.completePercent, 10);
    const stepDisplayName = this.props.step.name;
    const stepTitle = this.props.step.title ? " - " + this.props.step.title : "";

    return (
      <Card
        className="step-detail-group"
        key={`step-card-${this.props.step.id}`}
        style={{ marginBottom: "5px" }}
      >
        <CardActionArea
          onClick={this.handleStepToggle}
          aria-label="Show console log."
          className={`step-header step-header-${this.props.step.state.toLowerCase()} step-detail-group-${
            this.props.isExpanded ? "expanded" : "collapsed"
          }`}
          key={`step-action-area-${this.props.step.id}`}
        >
          {statusIcon}
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
                  className="log-card--header"
                  noWrap={true}
                  component="div"
                  key={`step-name-text-${this.props.step.id}`}
                  sx={{ flexGrow: 3 }}
                >
                  <Box
                    component="span"
                    fontWeight="bold"
                  >
                    {stepDisplayName}
                  </Box>
                  {stepTitle}
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
                className="log-card--text log-card--text-duration"
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

            <Grid item xs={1} alignItems="center" sx={{ margin: "auto" }}>
              <Tooltip title="Open console log in full-screen mode">
                <IconButton
                  aria-label={"Open console log in full-screen mode"}
                  onClick={handleOpen}
                >
                  <div className="svg-icon--expand">
                    <ResizeIcon/>
                  </div>
                </IconButton>
              </Tooltip>
              <Tooltip title="View step as plain text">
                <IconButton
                  onClick={() =>
                    window.open(`log?nodeId=${this.props.step.id}`)
                  }
                  aria-label="View step as plain text"
                >
                  <LinkIcon 
                    className="svg-icon--expand"
                  />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={2} alignItems="center" sx={{ margin: "auto" }}>
              <Tooltip title="Open console log">
                <ExpandMore
                  expand={this.props.isExpanded}
                  aria-label={"Open console log"}
                  aria-expanded
                  key={`step-expand-button-${this.props.step.id}`}
                  sx={{ display: "block", marginLeft: "auto" }}
                >
                  <ExpandMoreIcon
                    key={`step-expand-icon-${this.props.step.id}`}
                    className="svg-icon svg-icon--expand"
                  />
                </ExpandMore>
              </Tooltip>
            </Grid>
          </Grid>
        </CardActionArea>
        <ConsoleLogModal
          logBuffer={this.props.stepBuffer}
          handleMoreConsoleClick={this.props.handleMoreConsoleClick}
          step={this.props.step}
          open={this.state.open}
          setClose={handleClose}
        />
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
            <Suspense fallback={<CircularProgress />}>
              <ConsoleLogStream
                logBuffer={this.props.stepBuffer}
                handleMoreConsoleClick={this.props.handleMoreConsoleClick}
                step={this.props.step}
              />
            </Suspense>
          </CardContent>
        </Collapse>
      </Card>
    );
  }
}
