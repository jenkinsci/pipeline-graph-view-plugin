import React, { lazy } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider";
import { ResourceBundleName } from "../common/i18n/translations";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

export default function App() {
  return (
    <I18NProvider
      bundles={[ResourceBundleName.messages, ResourceBundleName.run]}
    >
      <PipelineConsole />
    </I18NProvider>
  );
}
