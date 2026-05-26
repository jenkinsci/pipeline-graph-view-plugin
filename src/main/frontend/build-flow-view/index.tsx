import { createRoot } from "react-dom/client";

import App from "./app.tsx";

// Support multiple mount points: full page, summary widget, job widget
const rootElement =
  document.getElementById("pgv-build-flow-root") ||
  document.getElementById("pgv-build-flow-summary") ||
  document.getElementById("pgv-build-flow-job");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
