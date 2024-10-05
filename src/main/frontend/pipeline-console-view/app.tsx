import React from "react";
import { lazy, Suspense } from "react";
import { FunctionComponent } from "react";

import { CircularProgress } from "@mui/material";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

const App: FunctionComponent = () => {
  return (
    <React.Fragment>
      <div>
        <Suspense fallback={<CircularProgress />}>
          <PipelineConsole />
        </Suspense>
      </div>
    </React.Fragment>
  );
};
export default App;
