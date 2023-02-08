import React from "react";

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Fade } from '@mui/material';

import { StepInfo } from "./DataTreeView"
import { ConsoleLogView } from "./ConsoleLogView";

import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/";

interface AccordonViewProps {
  steps: StepInfo[];
  updateStepConsoleText: (event: React.SyntheticEvent<{}>, nodeId: string) => void;
}

const fadeProps = {
  mountOnEnter: true,
  unmountOnExit: true,
  timeout: { enter: 225, exit: 195 }
}

export class AccordionView extends React.Component {
  props!: AccordonViewProps;

  constructor(props: AccordonViewProps) {
    super(props);
  }

  handleToggle(event: React.ChangeEvent<{}>, nodeIds: string[]): void {
    this.setState({
      expanded: nodeIds,
    });
  }

  handleChange =
  (nodeId: string) => (event: React.SyntheticEvent, expanded: boolean) => {
    if (expanded) {
      this.props.updateStepConsoleText(event, nodeId)
    }
  };

  getTreeItemsFromStepList = (stepsItems: StepInfo[]) => {
    return stepsItems.map((stepItemData) => {
      return (
        <Accordion 
        key={stepItemData.id}
        onChange={this.handleChange(String(stepItemData.id))}
        TransitionProps={{ mountOnEnter: false, unmountOnExit: false, timeout: { exit: 500 } }}
        disableGutters={true}
      >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1bh-content"
            id="panel1bh-header"
          >
            <Typography sx={{ color: 'text.secondary' }}>{stepItemData.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ConsoleLogView
              step={stepItemData}
            />
          </AccordionDetails>
        </Accordion>
      );
    });
  };
  
  render() {
    return (
      <React.Fragment>
        {this.getTreeItemsFromStepList(this.props.steps)}
      </React.Fragment>
    );
  }
}
