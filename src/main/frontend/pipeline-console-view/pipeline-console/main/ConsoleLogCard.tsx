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
import { StepInfo } from "./DataTreeView";
import { ConsoleLine } from "./ConsoleLine";
import StepStatus from "../../../step-status/StepStatus";
import { decodeResultValue } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
import { Expand } from "@mui/icons-material";

interface ConsoleLogCardProps {
  step: StepInfo;
  updateStepConsoleText: (
    event: React.SyntheticEvent<{}>,
    nodeId: string
  ) => void;
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

interface ConsoleLogCardState {
  expanded: boolean;
}

export class ConsoleLogCard extends React.Component<
  ConsoleLogCardProps,
  ConsoleLogCardState
> {
  constructor(props: ConsoleLogCardProps) {
    super(props);
    this.state = {
      expanded: false,
    };
    this.handleExpandClick = this.handleExpandClick.bind(this);
    this.handleExpandClick = this.handleExpandClick.bind(this);
  }

  handleExpandClick(event: React.MouseEvent<HTMLElement>) {
    let isExanded = this.state.expanded || false;
    if (!isExanded && !this.props.step.consoleText) {
      console.debug(`Fetching log for: ${this.props.step.id}`);
      this.props.updateStepConsoleText(event, String(this.props.step.id));
    }
    this.setState({
      expanded: !isExanded,
    });
  }

  renderConsoleOutput() {
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
          onClick={this.handleExpandClick}
          aria-label="Show console log."
        >
          <StepStatus
            status={decodeResultValue(this.props.step.state)}
            text=""
            key={`status-${this.props.step.id}`}
          />
          <Typography className="detail-element">
            {this.props.step.name}
          </Typography>
          <ExpandMore expand={this.state.expanded} aria-expanded>
            <ExpandMoreIcon />
          </ExpandMore>
        </CardActionArea>
        <Collapse in={this.state.expanded} timeout={50} unmountOnExit>
          <CardContent className="step-content">
            {this.renderConsoleOutput()}
          </CardContent>
        </Collapse>
      </Card>
    );
  }
}
