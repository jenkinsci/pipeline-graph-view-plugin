import React from "react";
import SplitView from "./SplitView.tsx";
import "./pipeline-console.scss";
import { useStepsPoller } from "./hooks/use-steps-poller.ts";

const DataTreeView = React.lazy(() => import("./DataTreeView.tsx"));
const StageView = React.lazy(() => import("./StageView.tsx"));

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
  );
}
