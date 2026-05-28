import { createRoot } from "react-dom/client";

import App from "./app.tsx";
import { getRootElement } from "./build-flow/main/BuildFlowUtils.ts";

const rootElement = getRootElement();

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
