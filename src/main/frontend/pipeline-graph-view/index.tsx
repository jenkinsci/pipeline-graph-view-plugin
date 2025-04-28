import React from "react";
import ReactDOMClient from "react-dom/client";
import App from "./app.tsx";

const rootElement = document.getElementById("graph");
if (!rootElement) throw new Error("Failed to find the 'graph' element");
const root = ReactDOMClient.createRoot(rootElement);

// Render App
root.render(<App />);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unusedVariable = "intentional typescript failure";

const _not_camel_case = "intentional eslint failure"

  console.log(_not_camel_case) // intentional prettier failure
