import React, { FunctionComponent } from "react";

import { MultiPipelineGraph } from "./multi-pipeline-graph/main/index.ts";

import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";
import { I18NProvider, ResourceBundleName } from "../common/i18n/index.ts";

const App: FunctionComponent = () => {
  const locale =
    document.getElementById("multiple-pipeline-root")?.dataset.userLocale ??
    "en";
  return (
    <div>
      <I18NProvider bundles={[ResourceBundleName.messages]} locale={locale}>
        <MultiPipelineGraph />
      </I18NProvider>
    </div>
  );
};

export default App;
