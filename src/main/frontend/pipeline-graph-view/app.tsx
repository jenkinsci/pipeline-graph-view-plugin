import { PipelineGraph } from "./pipeline-graph/main";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";
import React from "react";

export default function App() {
  const rootElement = document.getElementById("graph");
  const previousPath = rootElement?.dataset.previousRun;

  return (
    <div>
      <PipelineGraph stages={[]} collapsed={false} previousPath={previousPath} />
    </div>
  );
};
