import React from "react";
import ReactDOMClient from "react-dom/client";
import App from "./app.tsx";

const rootElement = document.getElementById("console-pipeline-root");
if (!rootElement) throw new Error("Failed to find the root element");
const root = ReactDOMClient.createRoot(rootElement);

// Render App
root.render(<App />);
