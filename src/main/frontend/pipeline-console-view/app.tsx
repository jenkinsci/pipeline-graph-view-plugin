import React, { lazy } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider.tsx";
import { FilterProvider } from "./pipeline-console/main/providers/filter-provider.tsx";
import { ResourceBundleName } from "../common/i18n/translations.ts";
import { LayoutPreferencesProvider } from "./pipeline-console/main/providers/user-preference-provider.tsx";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

export default function App() {
  const locale =
    document.getElementById("console-pipeline-root")?.dataset.userLocale ??
    "en";
  return (
    <I18NProvider bundles={[ResourceBundleName.messages]} locale={locale}>
      <FilterProvider>
        <LayoutPreferencesProvider>
          <PipelineConsole />
        </LayoutPreferencesProvider>
      </FilterProvider>
    </I18NProvider>
  );
}
