import * as React from "react";
import { FunctionComponent } from "react";

import { PipelineGraph } from "./pipeline-graph/main";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";

const App: FunctionComponent = () => {
  return (
    <div>
      <PipelineGraph
        stages={[]}
        collapsed={false}
      />
    </div>
  );
};

export default App;
