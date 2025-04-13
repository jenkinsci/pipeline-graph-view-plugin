import React, { Suspense } from "react";
import SplitView from "./SplitView";
import Skeleton from "./Skeleton";
import { usePipelineState } from "./Polly";
import { StageInfo } from "../../../pipeline-graph-view/pipeline-graph/main";
import { StepLogBufferInfo } from "../../../common/RestClient";
import { LOG_FETCH_SIZE } from "./PipelineConsoleModel";
import "./pipeline-console.scss";

const DataTreeView = React.lazy(() => import("./DataTreeView"));
const StageView = React.lazy(() => import("./StageView"));

export default function PipelineConsole() {
  const {
    openStage,
    expandedSteps,
    setExpandedSteps,
    stages,
    steps,
    stepBuffers,
    updateStepConsoleOffset,
    handleStageSelect,
  } = usePipelineState();

  const handleStepToggle = (_: any, nodeId: string) => {
    if (!expandedSteps.includes(nodeId)) {
      setExpandedSteps((prev) => [...prev, nodeId]);
      updateStepConsoleOffset(nodeId, false, 0 - LOG_FETCH_SIZE);
    } else {
      setExpandedSteps((prev) => prev.filter((id) => id !== nodeId));
    }
  };

  const handleMoreConsoleClick = (nodeId: string, startByte: number) => {
    updateStepConsoleOffset(nodeId, true, startByte);
  };

  const getStageSteps = (stageId: string) =>
    steps.filter((step) => step.stageId === stageId);

  const getStageStepBuffers = (stageId: string) => {
    const buffers = new Map<string, StepLogBufferInfo>();
    steps.forEach((step) => {
      if (step.stageId === stageId && stepBuffers.has(step.id)) {
        buffers.set(step.id, stepBuffers.get(step.id)!);
      }
    });
    return buffers;
  };

  const getOpenStage = (): StageInfo | null => {
    const findStage = (stages: StageInfo[]): StageInfo | null => {
      for (let stage of stages) {
        if (String(stage.id) === openStage) return stage;
        if (stage.children.length > 0) {
          const result = findStage(stage.children);
          if (result) return result;
        }
      }
      return null;
    };
    return openStage ? findStage(stages) : null;
  };

  return (
    <SplitView>
      <div key="tree-view" id="tree-view-pane" className="todo-sidebar">
        <Suspense fallback={<Skeleton />}>
          <DataTreeView
            onNodeSelect={(_, nodeId) => handleStageSelect(nodeId)}
            selected={openStage}
            stages={stages}
          />
        </Suspense>
      </div>

      <div key="stage-view" id="stage-view-pane">
        <Suspense fallback={<Skeleton />}>
          <StageView
            stage={getOpenStage()}
            steps={getStageSteps(openStage)}
            stepBuffers={getStageStepBuffers(openStage)}
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
