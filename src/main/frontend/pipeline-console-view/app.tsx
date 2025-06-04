import { lazy } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { UserPermissionsProvider } from "../common/user/user-permission-provider.tsx";
import { FilterProvider } from "./pipeline-console/main/providers/filter-provider.tsx";
import { LayoutPreferencesProvider } from "./pipeline-console/main/providers/user-preference-provider.tsx";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole.tsx"),
);

export default function App() {
  const locale = document.getElementById("console-pipeline-root")!.dataset
    .userLocale!;
  const configureProxy = document.getElementById(
    "console-pipeline-overflow-root",
  )?.dataset.proxyName;
  return (
    <UserPermissionsProvider proxy={{ configureProxy }}>
      <LocaleProvider locale={locale}>
        <I18NProvider bundles={[ResourceBundleName.messages]}>
          <FilterProvider>
            <LayoutPreferencesProvider>
              <PipelineConsole />
            </LayoutPreferencesProvider>
          </FilterProvider>
        </I18NProvider>
      </LocaleProvider>
    </UserPermissionsProvider>
  );
}
