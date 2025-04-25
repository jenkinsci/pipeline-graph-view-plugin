import React, { lazy } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider.js";
import { FilterProvider } from "./pipeline-console/main/providers/filter-provider.js";
import { ResourceBundleName } from "../common/i18n/translations.js";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole.js"),
);

export default function App() {
  const locale =
    document.getElementById("console-pipeline-root")?.dataset.userLocale ??
    "en";
  return (
    <I18NProvider
      bundles={[ResourceBundleName.messages, ResourceBundleName.run]}
      locale={locale}
    >
      <FilterProvider>
        <PipelineConsole />
      </FilterProvider>
    </I18NProvider>
  );
}
