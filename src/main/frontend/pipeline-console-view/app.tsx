import React, { lazy } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider";
import { ResourceBundleName } from "../common/i18n/translations";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
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
      <PipelineConsole />
    </I18NProvider>
  );
}
