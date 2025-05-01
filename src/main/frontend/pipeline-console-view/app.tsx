import { lazy } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { FilterProvider } from "./pipeline-console/main/providers/filter-provider.tsx";
import { LayoutPreferencesProvider } from "./pipeline-console/main/providers/user-preference-provider.tsx";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole.tsx"),
);

export default function App() {
  const locale = document.getElementById("console-pipeline-root")!.dataset
    .userLocale!;
  return (
    <LocaleProvider locale={locale}>
      <I18NProvider bundles={[ResourceBundleName.messages]}>
        <FilterProvider>
          <LayoutPreferencesProvider>
            <PipelineConsole />
          </LayoutPreferencesProvider>
        </FilterProvider>
      </I18NProvider>
    </LocaleProvider>
  );
}
