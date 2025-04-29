import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";

import React, { FunctionComponent } from "react";

import { I18NProvider, ResourceBundleName } from "../common/i18n/index.ts";
import { MultiPipelineGraph } from "./multi-pipeline-graph/main/index.ts";

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
