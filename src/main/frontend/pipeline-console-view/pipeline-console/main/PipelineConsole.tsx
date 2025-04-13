import React, { Suspense } from "react";
import SplitView from "./SplitView";
import Skeleton from "./Skeleton";
import { usePipelineState } from "./Polly";
import "./pipeline-console.scss";

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
    <SplitView>
      <div key="tree-view" id="tree-view-pane" className="todo-sidebar">
        <Suspense fallback={<Skeleton />}>
          <DataTreeView
            onNodeSelect={(_, nodeId) => handleStageSelect(nodeId)}
            selected={openStage?.id}
            stages={stages}
          />
        </Suspense>
      </div>

      <div key="stage-view" id="stage-view-pane">
        <Suspense fallback={<Skeleton />}>
          <StageView
            stage={openStage}
            steps={openStageSteps}
            stepBuffers={openStageStepBuffers}
            expandedSteps={expandedSteps}
            handleStepToggle={handleStepToggle}
            handleMoreConsoleClick={handleMoreConsoleClick}
            scrollParentId="stage-view-pane"
          />
        </Suspense>
      </div>
    </SplitView>
  );
}
