import * as React from "react";
import { DataTreeView } from './DataTreeView';

interface PipelineConsoleProps {}
interface PipelineConsoleState {
    consoleText: string
}

export class PipelineConsole extends React.Component {
    constructor(props: PipelineConsoleProps) {
        super(props)
        this.handleNodeSelect = this.handleNodeSelect.bind(this)
    }
    state: PipelineConsoleState = {
        consoleText: 'My Original Text'
    }

    handleNodeSelect(event: React.ChangeEvent<any>, nodeIds: string) {
      fetch(`consoleOutput?nodeIds=${nodeIds}`)
        .then(res => res.json())
        .then(json => this.setState({consoleText: json.text}))
        .catch(console.log);
    }

    render() {
        return (
            <React.Fragment>
                <div style={{minHeight: "40%"}}>
                    <div className="section-header">Pipeline Nodes</div>
                    <DataTreeView stages={[]} onNodeSelect={this.handleNodeSelect}/>
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
