import React, { lazy } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider.tsx";
import { FilterProvider } from "./pipeline-console/main/providers/filter-provider.tsx";
import { ResourceBundleName } from "../common/i18n/translations.ts";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole.tsx"),
);

export default function App() {
  const locale =
    document.getElementById("console-pipeline-root")?.dataset.userLocale ??
    "en";
  return (
    <I18NProvider bundles={[ResourceBundleName.messages]} locale={locale}>
      <FilterProvider>
        <PipelineConsole />
      </FilterProvider>
    </I18NProvider>
  );
}
