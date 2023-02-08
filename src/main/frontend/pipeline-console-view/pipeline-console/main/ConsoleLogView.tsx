
import React from "react";

import { ConsoleLine } from "./ConsoleLine"

interface ConsoleLogViewProps {
  consoleText: string;
  nodeId: string;
}

export class ConsoleLogView extends React.Component {
  props!: ConsoleLogViewProps;

  constructor(props: ConsoleLogViewProps) {
    super(props);
  }

  renderConsoleOutput() {
    if (this.props.consoleText.length > 0) {
      const lineChunks = this.props.consoleText.split("\n");
      return (
        <pre className="console-output">
          {lineChunks.map((line, index) => {
            let lineNumber = String(index + 1);
            return (
              <ConsoleLine
                content={line}
                lineNumber={lineNumber}
                stepId={this.props.nodeId}
                key={`${this.props.nodeId}-${lineNumber}`}
              />
            );
          })}
        </pre>
      );
    } else {
      return null;
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