import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";

import { FunctionComponent } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { MultiPipelineGraph } from "./multi-pipeline-graph/main/MultiPipelineGraph.tsx";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import SettingsButton from "./multi-pipeline-graph/main/SettingsButton.tsx";

const App: FunctionComponent = () => {
  const locale = document.getElementById("multiple-pipeline-root")!.dataset
    .userLocale!;
  return (
    <div>
      <LocaleProvider locale={locale}>
        <I18NProvider bundles={[ResourceBundleName.messages]}>
          <UserPreferencesProvider>
            <SettingsButton buttonPortal={document.getElementById("pgv-settings")}/>
            <MultiPipelineGraph/>
          </UserPreferencesProvider>
        </I18NProvider>
      </LocaleProvider>
    </div>
  );
};

export default App;
