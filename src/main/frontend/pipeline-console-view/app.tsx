import React from "react";
//import ReactDOM from "react-dom";
import { FunctionComponent } from "react";

import { PipelineConsole } from "./pipeline-console/main/";

const useScrollToLocation = () => {
  const scrolledRef = React.useRef(false);
  const hash = window.location.hash;
  const hashRef = React.useRef(hash);

  React.useEffect(() => {
    if (hash) {
      // We want to reset if the hash has changed
      if (hashRef.current !== hash) {
        hashRef.current = hash;
        scrolledRef.current = false;
      }

      // only attempt to scroll if we haven't yet (this could have just reset above if hash changed)
      if (!scrolledRef.current) {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          console.log("Found element, scrolling...")
          element.scrollIntoView({ behavior: 'smooth' });
          scrolledRef.current = true;
        }
      }
    }
  });
};

const App: FunctionComponent = () => {
  useScrollToLocation();
  return (
    <React.Fragment>
      <div>
        <PipelineConsole />
      </div>
    </React.Fragment>
  );
};
export default App;
