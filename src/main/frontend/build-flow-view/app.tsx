import { FunctionComponent } from "react";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { BuildFlow } from "./build-flow/main/BuildFlow.tsx";
import { getRootElement } from "./build-flow/main/BuildFlowUtils.ts";

const App: FunctionComponent = () => {
  const rootElement = getRootElement();
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
