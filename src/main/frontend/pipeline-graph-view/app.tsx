import * as React from "react";
import { FunctionComponent, useEffect } from "react";

import { PipelineGraph } from "./pipeline-graph/main";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";

function handleNodeClick(nodeName: string, id: number) {
  let location = `../pipeline-console?selected-node=${id}`;
  const url = new URL(window.location.href);
  if (!url.pathname.endsWith("pipeline-graph/")) {
    location = `pipeline-console?selected-node=${id}`;
  }

  window.location.href = location;
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
