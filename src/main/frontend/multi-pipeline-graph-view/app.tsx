import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";

import { FunctionComponent } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { MultiPipelineGraph } from "./multi-pipeline-graph/main/MultiPipelineGraph.tsx";

const App: FunctionComponent = () => {
  const locale = document.getElementById("multiple-pipeline-root")!.dataset
    .userLocale!;
  return (
    <div>
      <LocaleProvider locale={locale}>
        <I18NProvider bundles={[ResourceBundleName.messages]}>
          <MultiPipelineGraph />
        </I18NProvider>
      </LocaleProvider>
    </div>
  );
};

export default App;
