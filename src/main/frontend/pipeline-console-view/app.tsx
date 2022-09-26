import React from "react";
//import ReactDOM from "react-dom";
import { FunctionComponent } from "react";

import { PipelineConsole } from "./pipeline-console/main/";

const App: FunctionComponent = () => {
  console.log("Creating app...")
  return (
    <React.Fragment>
      <div>
        <PipelineConsole />
      </div>
    </React.Fragment>
  );
};
export default App;
