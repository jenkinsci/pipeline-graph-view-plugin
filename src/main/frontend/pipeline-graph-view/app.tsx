import * as React from "react";
import {
  FunctionComponent,
  useEffect,
  useState /*, useEffect, useState */,
} from "react";

import { PipelineGraph } from "./pipeline-graph/main";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";

// @ts-ignore
// const rootUrl = rootURL;
// @ts-ignore
// const csrfCrumb = crumb.value;

function handleNodeClick(nodeName: string, id: number) {
  alert(`clicked ${nodeName} ${id}`);
}

const App: FunctionComponent = () => {
  return (
    <div>
      <PipelineGraph stages={[]} onNodeClick={handleNodeClick} />
    </div>
  );
};

export default App;
