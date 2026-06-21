import "./app.scss";
import "./pipeline-graph/styles/main.scss";
import "../pipeline-console-view/pipeline-console/main/console-log-card.scss";

import { useState } from "react";

import useRunPoller from "../common/tree-api.ts";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import Stages from "../pipeline-console-view/pipeline-console/main/components/stages.tsx";
import { NoStageStepsFallback } from "../pipeline-console-view/pipeline-console/main/NoStageStepsFallback.tsx";
import { StageViewPosition } from "../pipeline-console-view/pipeline-console/main/providers/user-preference-provider.tsx";
import {
  LayoutInfo,
  Result,
} from "./pipeline-graph/main/PipelineGraphModel.tsx";

const buildLayout: Partial<LayoutInfo> = {
  graphSpacingTop: 3 + 1 + 32, // spacing for "Stages" button (top+border+a)
  graphSpacingRight: 18, // spacing for expand button
  graphSpacingBottom: 18, // spacing for zoom buttons
  graphSpacingLeft: 18, // align with right spacing
};

export default function App() {
  const rootElement = document.getElementById("graph");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;
  const normalizedParentJobPath = rootElement?.dataset.normalizedParentJobPath!;
  const { run, loading } = useRunPoller({
    currentRunPath,
    previousRunPath,
  });

  const [autoStageViewHeight, setAutoStageViewHeight] = useState(0);
  const [defaultStageViewHeight, setDefaultStageViewHeight] = useState(0);
  const height = autoStageViewHeight || defaultStageViewHeight;

  const onlyQueuedPlaceholder =
    run.stages.length === 1 &&
    run.stages[0].placeholder === true &&
    run.stages[0].state === Result.queued;
  const showBuildConsoleFallback =
    !loading && (run.stages.length === 0 || onlyQueuedPlaceholder);

  return (
    <UserPreferencesProvider>
      {showBuildConsoleFallback && (
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
                currentRunPath={currentRunPath}
                tailLogs={false}
                scrollToTail={() => {}}
              />
            </div>
          </div>
        </>
      )}

      {run.stages.length > 0 && !onlyQueuedPlaceholder && (
        <div style={height ? { height } : {}}>
          <Stages
            layout={buildLayout}
            stages={run.stages}
            stageViewPosition={StageViewPosition.TOP}
            onRunPage
            normalizedParentJobPath={normalizedParentJobPath}
            setAutoStageViewHeight={setAutoStageViewHeight}
            setDefaultStageViewHeight={setDefaultStageViewHeight}
          />
        </div>
      )}
    </UserPreferencesProvider>
  );
}
