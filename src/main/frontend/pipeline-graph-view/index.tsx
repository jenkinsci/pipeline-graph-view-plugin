import { createRoot } from "react-dom/client";

import App from "./app.tsx";

const rootElement = document.getElementById("graph");
if (!rootElement) throw new Error("Failed to find the 'graph' element");
const root = createRoot(rootElement);

// Render App
root.render(<App />);
