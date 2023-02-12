import React from "react";

import { StepInfo } from "./PipelineConsoleModel";
import { ConsoleLogCard } from "./ConsoleLogCard";

interface AccordonViewProps {
  steps: StepInfo[];
  expandedSteps: string[];
  handleStepToggle: (
    event: React.SyntheticEvent<{}>,
    nodeId: string
  ) => void;
}

const fadeProps = {
  mountOnEnter: true,
  unmountOnExit: true,
  timeout: { enter: 225, exit: 195 },
};

export class AccordionView extends React.Component {
  props!: AccordonViewProps;

  constructor(props: AccordonViewProps) {
    super(props);
  }

  handleChange =
    (nodeId: string) => (event: React.SyntheticEvent, expanded: boolean) => {
      this.props.handleStepToggle(event, nodeId);
    };

  getTreeItemsFromStepList = (stepsItems: StepInfo[]) => {
    return stepsItems.map((stepItemData) => {
      return (
        <ConsoleLogCard
          step={stepItemData}
          handleStepToggle={this.props.handleStepToggle}
          isExpanded={String(stepItemData.id) in this.props.expandedSteps}
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
