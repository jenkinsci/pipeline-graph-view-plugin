import "./app.scss";
import "./pipeline-graph/styles/main.scss";
import "../pipeline-console-view/pipeline-console/main/console-log-card.scss";

import useRunPoller from "../common/tree-api.ts";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import Stages from "../pipeline-console-view/pipeline-console/main/components/stages.tsx";
import { NoStageStepsFallback } from "../pipeline-console-view/pipeline-console/main/NoStageStepsFallback.tsx";
import { StageViewPosition } from "../pipeline-console-view/pipeline-console/main/providers/user-preference-provider.tsx";

export default function App() {
  const rootElement = document.getElementById("graph");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;
  const { run, loading } = useRunPoller({
    currentRunPath,
    previousRunPath,
  });

  return (
    <UserPreferencesProvider>
      {!loading && run.stages.length === 0 && (
        <>
          <div className={"jenkins-card__title"}>
            <a
              href="stages"
              className="jenkins-card__title-link jenkins-card__reveal"
            >
              Stages
              {/* Markup copied from core */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                viewBox="0 0 512 512"
              >
                <path
                  d="M184 112l144 144-144 144"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="48"
                />
              </svg>
            </a>
          </div>

          <div className={"jenkins-card__content"}>
            <div className={"pgv-console-card"}>
              <NoStageStepsFallback
                url={currentRunPath}
                tailLogs={false}
                scrollToTail={() => {}}
              />
            </div>
          </div>
        </>
      )}

      {run.stages.length > 0 && (
        <Stages
          stages={run.stages}
          stageViewPosition={StageViewPosition.TOP}
          onRunPage
        />
      )}
    </UserPreferencesProvider>
  );
}
