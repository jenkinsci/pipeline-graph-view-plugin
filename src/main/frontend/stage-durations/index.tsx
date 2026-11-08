import { createRoot } from "react-dom/client";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import StageDurations from "./stage-durations.tsx";

const rootElement = document.getElementById("stage-durations-root");
if (!rootElement) {
  throw new Error("Failed to find the 'stage-durations-root' element");
}
const { currentJobPath, userLocale } = rootElement.dataset;

createRoot(rootElement).render(
  <LocaleProvider locale={userLocale!}>
    <I18NProvider bundles={[ResourceBundleName.messages]}>
      <StageDurations jobPath={currentJobPath!} />
    </I18NProvider>
  </LocaleProvider>,
);
