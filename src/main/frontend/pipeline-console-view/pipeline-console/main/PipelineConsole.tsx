import * as React from "react";
import SplitPane, { Pane } from 'react-split-pane';
import { DataTreeView } from './DataTreeView';
import parse from 'html-react-parser';

import "./pipeline-console.scss";


interface PipelineConsoleProps {}
interface PipelineConsoleState {
    consoleText: string
}

export class PipelineConsole extends React.Component {
    constructor(props: PipelineConsoleProps) {
        super(props)
        this.handleActionNodeSelect = this.handleActionNodeSelect.bind(this)
    }
    state: PipelineConsoleState = {
        consoleText: 'Select a node to view console output.'
    }

    handleActionNodeSelect(event: React.ChangeEvent<any>, nodeIds: string) {
      fetch(`consoleOutput?nodeId=${nodeIds}`)
        .then(res => res.text())
        .then(text => {
            console.log(text)
            this.setState({consoleText: text})
        })
        .catch(console.log);
    }

    render() {
        const splitPaneStyle: React.CSSProperties = {
          position: 'relative',
          height: '100%',
        }
        const paneStyle:  React.CSSProperties = {
          paddingLeft: '8px',
          textAlign: 'left'
        }

        return (
          <React.Fragment>
            <div className="App">
              <SplitPane split="vertical" minSize={150}
                    defaultSize={parseInt(localStorage.getItem('splitPos') || '10')}
                    onChange={(size) => localStorage.setItem('splitPos', `${size}`)}
                    style={splitPaneStyle}>
                <div style={paneStyle}>
                  <DataTreeView stages={[]} onActionNodeSelect={this.handleActionNodeSelect}/>
                </div>
                <div className="console-output">
                    <pre className="console-pane">
                        {this.state.consoleText}
                    </pre>
                </div>
              </SplitPane>
            </div>
          </React.Fragment>
        );
    }
}
