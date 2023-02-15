import * as React from "react";
import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActions";

import Collapse from "@mui/material/Collapse";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { StepInfo } from "./PipelineConsoleModel";
import { ConsoleLine } from "./ConsoleLine";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import { LOG_FETCH_SIZE } from "./PipelineConsoleModel";

export interface StepSummaryProps {
  step: StepInfo;
}

interface ConsoleLogCardProps {
  step: StepInfo;
  isExpanded: boolean;
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
}

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

export class ConsoleLogCard extends React.Component<ConsoleLogCardProps> {
  constructor(props: ConsoleLogCardProps) {
    super(props);
    this.handleStepToggle = this.handleStepToggle.bind(this);
  }

  handleStepToggle(event: React.MouseEvent<HTMLElement>) {
    this.props.handleStepToggle(event, String(this.props.step.id));
  }

  getTrucatedLogWarning() {
    if (this.props.step.consoleStartByte != 0) {
      return (
        <Grid container xs={12}>
          <Grid item xs={6} sm>
            <Typography align="right" className="step-header">
              {`Missing ${this.prettySizeString(
                this.props.step.consoleStartByte
              )} of logs.`}
            </Typography>
          </Grid>
          <Grid item xs={6} sm>
            <Button
              variant="text"
              sx={{ padding: "0px" }}
              onClick={() => {
                let startByte =
                  this.props.step.consoleStartByte - LOG_FETCH_SIZE;
                console.debug(
                  `startByte '${this.props.step.consoleStartByte}' -> '${startByte}'`
                );
                if (startByte < 0) {
                  startByte = 0;
                }
                this.props.handleMoreConsoleClick(
                  String(this.props.step.id),
                  startByte
                );
              }}
            >
              Click to get more logs
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
      return `${size}b`;
    } else if (size < mib) {
      return `${(size / kib).toFixed(2)}KiB`;
    } else if (size < gib) {
      return `${(size / mib).toFixed(2)}MiB`;
    }
    return `${(size / gib).toFixed(2)}GiB`;
  }

  renderConsoleOutput() {
    // TODO: Consider if we need to render each time a step is opened (maybe just if it's opened and the console has been updated since)?
    if (
      this.props.step.consoleLines &&
      this.props.step.consoleLines.length > 0
    ) {
      console.debug("Generating console log");
      return (
        <pre className="console-output">
          {this.getTrucatedLogWarning()}
          {this.props.step.consoleLines.map((line, index) => {
            let lineNumber = String(index + 1);
            return (
              <ConsoleLine
                content={line}
                lineNumber={lineNumber}
                stepId={String(this.props.step.id)}
                key={`${String(this.props.step.id)}-${lineNumber}`}
                startByte={this.props.step.consoleEndByte || LOG_FETCH_SIZE}
              />
            );
          })}
        </pre>
      );
    }
    console.debug("Empty console text");
    return "";
  }

  render() {
    return (
      <Card className="step-detail-group">
        <CardActionArea
          onClick={this.handleStepToggle}
          aria-label="Show console log."
          className={`step-header-${this.props.step.state.toLowerCase()}`}
        >
          <Grid container xs={12}>
            <Grid item xs={11} sm container>
              <Grid item xs container direction="column" spacing={2}>
                <Grid item xs width="100%">
                  <Typography className="detail-element-header" noWrap={true}>
                    {this.props.step.name.substring(
                      0,
                      this.props.step.name.lastIndexOf("-") - 1
                    )}
                  </Typography>
                  <Typography
                    className="detail-element"
                    component="div"
                    color="text.secondary"
                  >
                    {this.props.step.name.substring(
                      this.props.step.name.lastIndexOf("-") + 1,
                      this.props.step.name.length
                    )}
                  </Typography>
                </Grid>
              </Grid>
              <Grid item xs={1}>
                <Typography
                  className="detail-element"
                  align="right"
                  component="div"
                  color="text.secondary"
                  width="80%"
                >
                  {this.props.step.totalDurationMillis.substring(
                    this.props.step.totalDurationMillis.indexOf(" ") + 1,
                    this.props.step.totalDurationMillis.length
                  )}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <ExpandMore expand={this.props.isExpanded} aria-expanded>
            <ExpandMoreIcon />
          </ExpandMore>
        </CardActionArea>
        <Collapse in={this.props.isExpanded} timeout={50} unmountOnExit>
          <CardContent className="step-content">
            {this.renderConsoleOutput()}
          </CardContent>
        </Collapse>
      </Card>
    );
  }
}
