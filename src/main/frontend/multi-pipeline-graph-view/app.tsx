import * as React from "react";
import { FunctionComponent } from "react";

import { MultiPipelineGraph } from "./multi-pipeline-graph/main";

import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";

const App: FunctionComponent = () => {
  return (
    <div>
      <MultiPipelineGraph />
    </div>
  );
};

export default App;
