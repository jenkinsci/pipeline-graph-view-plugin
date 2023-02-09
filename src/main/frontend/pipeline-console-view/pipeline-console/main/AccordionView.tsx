import React from "react";

import { StepInfo } from "./DataTreeView"
import { ConsoleLogCard } from "./ConsoleLogCard";

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
        <ConsoleLogCard
          step={stepItemData}
          updateStepConsoleText={this.props.updateStepConsoleText}
        />
      );
    });
  };
  
  render() {
    return (
      <React.Fragment key={`accordion-1`}>
        {this.getTreeItemsFromStepList(this.props.steps)}
      </React.Fragment>
    );
  }
}
