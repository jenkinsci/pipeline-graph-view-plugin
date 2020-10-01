import * as React from 'react';
import { FunctionComponent /*, useEffect, useState */ } from 'react';

import { PipelineGraph } from './pipeline-graph/main';

import './app.scss';
import './pipeline-graph/styles/main.scss';

// @ts-ignore
// const rootUrl = rootURL;
// @ts-ignore
// const csrfCrumb = crumb.value;

const data: any = require('./test-data.json');

function handleNodeClick(nodeName: string, id: number) {
  alert(`clicked ${nodeName} ${id}`);
}

const App: FunctionComponent = () => {
/*
  const [authorizationStrategy, setAuthorizationStrategy] = useState(null);

  useEffect(() => {
    (async () => {
      const request = await fetch(`${rootUrl}/folder-auth/authorizationStrategy`, {
        headers: {
          'Jenkins-Crumb': csrfCrumb,
        },
      });
      const data = await request.json();
      setAuthorizationStrategy(data);
    })().catch(err => {
      throw new Error(`Unable to load authorization strategy: ${err}`);
    });
  }, []);
  */

  return (
    <div>
      <PipelineGraph stages={data} onNodeClick={handleNodeClick} />
    </div>
  );
}

export default App;