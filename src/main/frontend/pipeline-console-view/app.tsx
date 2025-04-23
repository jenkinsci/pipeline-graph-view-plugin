import React from "react";
import { lazy } from "react";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

export default function App() {
  return <PipelineConsole />;
}
