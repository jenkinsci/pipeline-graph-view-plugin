import { FunctionComponent } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { BuildFlow } from "./build-flow/main/BuildFlow.tsx";

const App: FunctionComponent = () => {
  const rootElement =
    document.getElementById("pgv-build-flow-root") ||
    document.getElementById("pgv-build-flow-summary") ||
    document.getElementById("pgv-build-flow-job");
  const locale = rootElement?.dataset.userLocale ?? "en";

  return (
    <LocaleProvider locale={locale}>
      <I18NProvider bundles={[ResourceBundleName.messages]}>
        <BuildFlow />
      </I18NProvider>
    </LocaleProvider>
  );
};

export default App;
