
import React from "react";

import { StepInfo } from "./DataTreeView"
import { ConsoleLine } from "./ConsoleLine"
interface ConsoleLogViewProps {
  step: StepInfo;
}

export class ConsoleLogView extends React.Component {
  props!: ConsoleLogViewProps;

  constructor(props: ConsoleLogViewProps) {
    super(props);
  }

  renderConsoleOutput() {
    if (this.props.step.consoleText) {
      if (this.props.step.consoleText.length > 0) {
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
      } else {
        return null;
      }
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.renderConsoleOutput()}
      </React.Fragment>
    )
  }
}