import React from "react";
import { lazy, Suspense } from "react";
import { FunctionComponent } from "react";
import Skeleton from "./pipeline-console/main/Skeleton";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

const App: FunctionComponent = () => {
  return (
    <React.Fragment>
      <div>
        <Suspense fallback={<Skeleton />}>
          <PipelineConsole />
        </Suspense>
      </div>
    </React.Fragment>
  );
};
export default App;
