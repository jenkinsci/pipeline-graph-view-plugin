import React from "react";
import { lazy } from "react";

import { I18NProvider } from "../common/i18n/i18n-provider";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

export default function App() {
  return (
    <I18NProvider>
      <PipelineConsole />
    </I18NProvider>
  );
}
