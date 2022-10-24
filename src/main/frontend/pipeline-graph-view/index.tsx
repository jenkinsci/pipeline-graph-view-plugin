import React from "react";
import ReactDOMClient from "react-dom/client";
import App from "./app";

import { resetEnvironment } from "../common/reset-environment";

resetEnvironment();
const rootElement = document.getElementById('graph');
if (!rootElement) throw new Error("Failed to find the 'graph' element");
const root = ReactDOMClient.createRoot(rootElement);

// Render App
root.render(<App />);