import React from "react";
import ReactDOMClient from "react-dom/client";
import App from "./app";

import { resetEnvironment } from "../common/reset-environment";

resetEnvironment();
const rootElement = document.getElementById('multiple-pipeline-root');
if (!rootElement) throw new Error("Failed to find the 'multiple-pipeline-root' element");
const root = ReactDOMClient.createRoot(rootElement);

// Render App
root.render(<App />);