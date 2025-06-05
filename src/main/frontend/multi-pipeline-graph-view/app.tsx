import "./app.scss";
import "./multi-pipeline-graph/styles/main.scss";

import { FunctionComponent } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import { MultiPipelineGraph } from "./multi-pipeline-graph/main/MultiPipelineGraph.tsx";
import SettingsButton from "./multi-pipeline-graph/main/settings-button.tsx";
import OverflowDropdown from "./multi-pipeline-graph/main/overfow-dropdown.tsx";
import { UserPermissionsProvider } from "../common/user/user-permission-provider.tsx";

const App: FunctionComponent = () => {
  const locale = document.getElementById("multiple-pipeline-root")!.dataset
    .userLocale!;
  const settings = document.getElementById("pgv-settings");
  const overflow = document.getElementById("multiple-pipeline-overflow-root");
  if (!settings && !overflow) {
    throw new Error("Failed to find the 'settings/overflow' element");
  }
  if (settings && overflow) {
    throw new Error("Only one of the 'settings/overflow' elements should be defined");
  }
  return (
    <div>
      <LocaleProvider locale={locale}>
        <I18NProvider bundles={[ResourceBundleName.messages]}>
          <UserPreferencesProvider>
            {settings && (
              <SettingsButton
                buttonPortal={settings}
              />
            )}
            {overflow && (
              <UserPermissionsProvider>
                <OverflowDropdown buttonPortal={overflow}/>
              </UserPermissionsProvider>
            )}
            <MultiPipelineGraph />
          </UserPreferencesProvider>
        </I18NProvider>
      </LocaleProvider>
    </div>
  );
};

export default App;
