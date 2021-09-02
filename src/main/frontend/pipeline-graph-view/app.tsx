import * as React from "react";
import { FunctionComponent } from "react";

import { PipelineGraph } from "./pipeline-graph/main";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";

function handleNodeClick(nodeName: string, id: number) {
  window.location.href = `../pipeline-console?selected-node=${id}`;
}

const App: FunctionComponent = () => {
  return (
    <div>
      <PipelineGraph
        stages={[]}
        onNodeClick={handleNodeClick}
        collapsed={false}
      />
    </div>
  );
};

export default App;
