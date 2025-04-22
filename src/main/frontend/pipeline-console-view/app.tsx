import React, { FunctionComponent, lazy, Suspense } from "react";

import { CircularProgress } from "@mui/material";
import { I18NProvider } from "../common/i18n/i18n-provider";

const PipelineConsole = lazy(
  () => import("./pipeline-console/main/PipelineConsole"),
);

const App: FunctionComponent = () => {
  return (
    <React.Fragment>
      <div>
        <Suspense fallback={<CircularProgress />}>
          <I18NProvider>
            <PipelineConsole />
          </I18NProvider>
        </Suspense>
      </div>
    </React.Fragment>
  );
};
export default App;
