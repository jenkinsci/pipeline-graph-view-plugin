import * as React from "react";
import { DataTreeView } from './DataTreeView';

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
        consoleText: 'My Original Text'
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
        return (
            <React.Fragment>
                <div style={{minHeight: "40%"}}>
                    <div className="section-header">Pipeline Nodes</div>
                    <DataTreeView stages={[]} onActionNodeSelect={this.handleActionNodeSelect}/>
                </div>
                <hr></hr>
                <div className="console-output">
                    <div className="section-header">Node Console Output</div>
                    <pre id="console-pane">
                        {this.state.consoleText}
                    </pre>
                </div>
            </React.Fragment>
        );
    }
}
