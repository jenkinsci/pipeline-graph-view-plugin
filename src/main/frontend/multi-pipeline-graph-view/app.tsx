import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";

import { FunctionComponent } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider.tsx";
import { ResourceBundleName } from "../common/i18n/messages.ts";
import { MultiPipelineGraph } from "./multi-pipeline-graph/main/MultiPipelineGraph.tsx";

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
