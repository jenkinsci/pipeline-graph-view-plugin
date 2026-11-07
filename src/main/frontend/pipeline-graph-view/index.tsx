import { createRoot } from "react-dom/client";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import App from "./app.tsx";

const bundles = [ResourceBundleName.messages];

const rootElement = document.getElementById("graph");
if (!rootElement) throw new Error("Failed to find the 'graph' element");
const root = createRoot(rootElement);

root.render(
  <LocaleProvider locale={rootElement.dataset.userLocale!}>
    <I18NProvider bundles={bundles}>
      <App />
    </I18NProvider>
  </LocaleProvider>,
);
