import React from "react";
import "./pipeline-console.scss";
import { useStepsPoller } from "./hooks/use-steps-poller";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";
import SplitView from "./split-view";
import { useLayoutPreferences } from "./providers/user-preference-provider";
import VisibilitySelect from "./components/checkboxes";

const DataTreeView = React.lazy(() => import("./DataTreeView"));
const StageView = React.lazy(() => import("./StageView"));

export default function PipelineConsole() {
  const rootElement = document.getElementById("console-pipeline-root");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;

  const { stageViewPosition, mainViewVisibility } = useLayoutPreferences();
  const {
    openStage,
    openStageSteps,
    openStageStepBuffers,
    expandedSteps,
    stages,
    handleStageSelect,
    handleStepToggle,
    handleMoreConsoleClick,
  } = useStepsPoller({ currentRunPath, previousRunPath });

  return (
    <>
      <div>
        <VisibilitySelect />
      </div>
      <SplitView
        direction={stageViewPosition === "top" ? "vertical" : "horizontal"}
        storageKey="stage"
      >
        {(mainViewVisibility === "both" ||
          mainViewVisibility === "stageOnly") && (
          <div
            style={{
              position: "relative",
              background: "var(--button-background)",
              border: "var(--jenkins-border)",
              marginBottom: "var(--section-padding)",
              borderRadius: "var(--form-input-border-radius)",
              overflow: "hidden",
              height: "100%",
            }}
          >
            <PipelineGraph
              stages={stages}
              handleStageSelect={handleStageSelect}
            />
          </div>
        )}

        <SplitView storageKey="tree">
          {(mainViewVisibility === "both" ||
            mainViewVisibility === "treeOnly") && (
            <div
              key="tree-view"
              id="tree-view-pane"
              className="pgv-sticky-sidebar"
            >
              <DataTreeView
                onNodeSelect={(_, nodeId) => handleStageSelect(nodeId)}
                selected={openStage?.id}
                stages={stages}
              />
            </div>
          )}

          <div key="stage-view" id="stage-view-pane">
            <StageView
              stage={openStage}
              steps={openStageSteps}
              stepBuffers={openStageStepBuffers}
              expandedSteps={expandedSteps}
              handleStepToggle={handleStepToggle}
              handleMoreConsoleClick={handleMoreConsoleClick}
            />
          </div>
        </SplitView>
      </SplitView>
    </>
  );
}
