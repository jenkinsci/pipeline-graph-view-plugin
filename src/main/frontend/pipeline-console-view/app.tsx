import React, { Suspense } from "react";
import { lazy } from "react";
import Placeholder from "./pipeline-console/main/Placeholder";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

export default function App() {
  function ConsolePlaceholder() {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "1rem",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <Placeholder height={2} />
          <Placeholder height={2} />
          <Placeholder height={2} />
          <Placeholder height={2} />
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <Placeholder height={2.5} />
          <Placeholder height={10} />
          <Placeholder height={10} />
          <Placeholder height={10} />
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ConsolePlaceholder />}>
      <PipelineConsole />
    </Suspense>
  );
}
