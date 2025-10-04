import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { UserPermissionsProvider } from "../common/user/user-permission-provider.tsx";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import PipelineConsole from "./pipeline-console/main/PipelineConsole.tsx";
import { FilterProvider } from "./pipeline-console/main/providers/filter-provider.tsx";
import { LayoutPreferencesProvider } from "./pipeline-console/main/providers/user-preference-provider.tsx";

export default function App() {
  const locale = document.getElementById("console-pipeline-root")!.dataset
    .userLocale!;
  return (
    <UserPermissionsProvider>
      <LocaleProvider locale={locale}>
        <I18NProvider bundles={[ResourceBundleName.messages]}>
          <FilterProvider>
            <UserPreferencesProvider>
              <LayoutPreferencesProvider>
                <PipelineConsole />
              </LayoutPreferencesProvider>
            </UserPreferencesProvider>
          </FilterProvider>
        </I18NProvider>
      </LocaleProvider>
    </UserPermissionsProvider>
  );
}
