import * as React from "react";
import { FunctionComponent } from "react";

import { MultiPipelineGraph } from "./multi-pipeline-graph/main";

import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";
import { I18NProvider } from "../common/i18n/i18n-provider";

const App: FunctionComponent = () => {
  return (
    <div>
      <I18NProvider>
        <MultiPipelineGraph />
      </I18NProvider>
    </div>
  );
};

export default App;
