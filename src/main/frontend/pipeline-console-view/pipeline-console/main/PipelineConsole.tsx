import React from "react";
import SplitView from "./SplitView";
import { usePipelineState } from "./Polly";
import "./pipeline-console.scss";
import ScrollToTopBottom from "./ScrollToTopBottom";

const DataTreeView = React.lazy(() => import("./DataTreeView"));
const StageView = React.lazy(() => import("./StageView"));

export default function PipelineConsole() {
  const {
    openStage,
    openStageSteps,
    openStageStepBuffers,
    expandedSteps,
    stages,
    handleStageSelect,
    handleStepToggle,
    handleMoreConsoleClick,
  } = usePipelineState();

  return (
    <>
      <SplitView>
        <div key="tree-view" id="tree-view-pane" className="todo-sidebar">
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
            scrollParentId="stage-view-pane"
          />
        </div>
      </SplitView>
      <ScrollToTopBottom />
    </>
  );
}
