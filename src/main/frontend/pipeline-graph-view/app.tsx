import { PipelineGraph } from "./pipeline-graph/main/PipelineGraph.tsx";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";
import React from "react";

export default function App() {
  const rootElement = document.getElementById("graph");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;

  return (
    <div>
      <PipelineGraph
        stages={[]}
        collapsed={false}
        currentRunPath={currentRunPath}
        previousRunPath={previousRunPath}
      />
    </div>
  );
}
