import * as React from "react";
import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActions";

import Collapse from "@mui/material/Collapse";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { red } from "@mui/material/colors";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { StepInfo } from "./PipelineConsoleModel";
import { ConsoleLine } from "./ConsoleLine";
import StepStatus from "../../../step-status/StepStatus";
import { decodeResultValue } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
import { Expand } from "@mui/icons-material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import InfoIcon from "@mui/icons-material/Info";
import Grid from "@mui/material/Grid";

export interface StepSummaryProps {
  step: StepInfo;
}

interface ConsoleLogCardProps {
  step: StepInfo;
  isExpanded: boolean;
  handleStepToggle: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
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

  renderConsoleOutput() {
    // TODO: Consider if we need to render each time a step is opened (maybe just if it's opened and the console has been updated since)?
    if (this.props.step.consoleText && this.props.step.consoleText.length > 0) {
      console.debug("Generating console log");
      const lineChunks = this.props.step.consoleText.split("\n") || [];
      return (
        <pre className="console-output">
          {lineChunks.map((line, index) => {
            let lineNumber = String(index + 1);
            return (
              <ConsoleLine
                content={line}
                lineNumber={lineNumber}
                stepId={String(this.props.step.id)}
                key={`${String(this.props.step.id)}-${lineNumber}`}
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
          <Grid container zeroMinWidth xs={12}>
            <Grid item zeroMinWidth xs={11} sm container>
              <Grid
                item
                xs
                container
                zeroMinWidth
                direction="column"
                spacing={2}
              >
                <Grid item xs zeroMinWidth width="100%">
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
              <Grid item zeroMinWidth xs={1}>
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
