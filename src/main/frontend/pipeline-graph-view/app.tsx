import { PipelineGraph } from "./pipeline-graph/main";

import "./app.scss";
import "./pipeline-graph/styles/main.scss";
import React from "react";
import { I18NProvider } from "../common/i18n/i18n-provider";

export default function App() {
  const rootElement = document.getElementById("graph");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;

  return (
    <div>
      <I18NProvider>
        <PipelineGraph
          stages={[]}
          collapsed={false}
          currentRunPath={currentRunPath}
          previousRunPath={previousRunPath}
        />
      </I18NProvider>
    </div>
  );
}
