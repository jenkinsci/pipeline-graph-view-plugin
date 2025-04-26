import React from "react";
import SplitView from "./SplitView";
import "./pipeline-console.scss";
import { useStepsPoller } from "./hooks/use-steps-poller";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";

const DataTreeView = React.lazy(() => import("./DataTreeView"));
const StageView = React.lazy(() => import("./StageView"));

export default function PipelineConsole() {
  const rootElement = document.getElementById("console-pipeline-root");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;

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
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "25vh",
          background: "var(--button-background)",
          paddingTop: "30px",
          border: "var(--jenkins-border)",
          marginBottom: "var(--section-padding)",
          borderRadius: "var(--form-input-border-radius)",
        }}
      >
        <PipelineGraph stages={stages} currentRunPath={currentRunPath} />
      </div>
      <SplitView>
        <div key="tree-view" id="tree-view-pane" className="pgv-sticky-sidebar">
          <DataTreeView
            onNodeSelect={(_, nodeId) => handleStageSelect(nodeId)}
            selected={openStage?.id}
            stages={stages}
          />
        </div>

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
    </div>
  );
}
