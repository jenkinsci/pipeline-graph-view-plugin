import React, { FunctionComponent } from "react";

import { MultiPipelineGraph } from "./multi-pipeline-graph/main/index.ts";

import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";
import { I18NProvider } from "../common/i18n/i18n-provider.tsx";
import { ResourceBundleName } from "../common/i18n/translations.ts";

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
