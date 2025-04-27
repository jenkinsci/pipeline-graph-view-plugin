import * as React from "react";
import { FunctionComponent } from "react";

import { MultiPipelineGraph } from "./multi-pipeline-graph/main";

import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";
import { I18NProvider } from "../common/i18n/i18n-provider";
import { ResourceBundleName } from "../common/i18n/translations";

const App: FunctionComponent = () => {
  const locale =
    document.getElementById("multiple-pipeline-root")?.dataset.userLocale ??
    "en";
  return (
    <div>
      <I18NProvider
        bundles={[ResourceBundleName.messages, ResourceBundleName.timing]}
        locale={locale}
      >
        <MultiPipelineGraph />
      </I18NProvider>
    </div>
  );
};

export default App;
