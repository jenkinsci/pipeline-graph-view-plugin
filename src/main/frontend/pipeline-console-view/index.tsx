import { createRoot } from "react-dom/client";

import App from "./app.tsx";

const rootElement = document.getElementById("console-pipeline-root");
if (!rootElement) throw new Error("Failed to find the root element");
const root = createRoot(rootElement);

// Render App
root.render(<App />);
