import "./app.scss";
import "./pipeline-graph/styles/main.scss";

import useRunPoller from "../common/tree-api.ts";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import Stages from "../pipeline-console-view/pipeline-console/main/components/stages.tsx";
import { StageViewPosition } from "../pipeline-console-view/pipeline-console/main/providers/user-preference-provider.tsx";

export default function App() {
  const rootElement = document.getElementById("graph");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;
  const { run } = useRunPoller({
    currentRunPath,
    previousRunPath,
  });

  return (
    <div>
      <UserPreferencesProvider>
        <Stages
          stages={run.stages}
          stageViewPosition={StageViewPosition.TOP}
          onRunPage
        />
      </UserPreferencesProvider>
    </div>
  );
}
