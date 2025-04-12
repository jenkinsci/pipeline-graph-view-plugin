import React, { useEffect, useState, Suspense, useCallback } from "react";
import {
  LOG_FETCH_SIZE,
  StepLogBufferInfo,
  getRunStatus,
  getRunSteps,
  getConsoleTextOffset,
  pollUntilComplete,
  RunStatus,
} from "./PipelineConsoleModel";

import "./pipeline-console.scss";
import { StageInfo, StepInfo, Result } from "./PipelineConsoleModel";
import SplitView from "./SplitView";
import Skeleton from "./Skeleton";

const DataTreeView = React.lazy(() => import("./DataTreeView"));
const StageView = React.lazy(() => import("./StageView"));

interface PipelineStatusInfo extends RunStatus {
  steps: StepInfo[];
}

export const getDefaultSelectedStep = (steps: StepInfo[]) => {
  let selectedStep = steps.find((step) => step !== undefined);
  if (!steps || steps.length === 0 || !selectedStep) return null;

  for (let step of steps) {
    let stepResult = step.state.toLowerCase() as Result;
    let selectedStepResult = selectedStep?.state.toLowerCase() as Result;
    switch (stepResult) {
      case Result.running:
      case Result.queued:
      case Result.paused:
        return step;
      case Result.unstable:
      case Result.failure:
      case Result.aborted:
        if (selectedStepResult && stepResult < selectedStepResult) return step;
        continue;
      default:
        if (selectedStepResult && stepResult <= selectedStepResult)
          selectedStep = step;
    }
  }
  return selectedStep;
};

export const updateStepBuffer = async (
  stepId: string,
  startByte: number,
  stepBuffer: StepLogBufferInfo,
): Promise<StepLogBufferInfo> => {
  const response = await getConsoleTextOffset(stepId, startByte);
  if (!response) {
    console.warn(`Skipping update of console text as client returned null.`);
    return stepBuffer;
  }
  const newLogLines = response.text.trim().split("\n") || [];

  if (stepBuffer.endByte > 0 && stepBuffer.endByte <= startByte) {
    if (stepBuffer.endByte < startByte) {
      console.warn(
        `Log update requested, but there will be a gap of '${startByte - stepBuffer.endByte}'B in logs.`,
      );
    }
    if (newLogLines.length > 0) {
      stepBuffer.lines = [...stepBuffer.lines, ...newLogLines];
    }
  } else {
    stepBuffer.lines = newLogLines;
    stepBuffer.startByte = response.startByte;
  }
  stepBuffer.endByte = response.endByte;
  return stepBuffer;
};

const PipelineConsole: React.FC = () => {
  const [openStage, setOpenStage] = useState("");
  // const [expandedStages, setExpandedStages] = useState<string[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [stepBuffers, setStepBuffers] = useState(
    new Map<string, StepLogBufferInfo>(),
  );
  // const [isComplete, setIsComplete] = useState(false);
  // const [hasInitialized, setHasInitialized] = useState(false);

  const getStateUpdate = async (): Promise<PipelineStatusInfo> => {
    const [runStatus, runSteps] = await Promise.all([
      getRunStatus(),
      getRunSteps(),
    ]);
    return {
      ...(runStatus ?? { isComplete: false, stages: [] }),
      ...(runSteps ?? { steps: [] }),
    } as PipelineStatusInfo;
  };

  const updateStepConsoleOffset = useCallback(
    async (stepId: string, forceUpdate: boolean, startByte: number) => {
      let stepBuffer = stepBuffers.get(stepId) ?? {
        lines: [],
        startByte: 0 - LOG_FETCH_SIZE,
        endByte: -1,
        stepId,
      };
      if (stepBuffer.startByte > 0 && !forceUpdate) return;
      const updatedBuffer = await updateStepBuffer(
        stepId,
        startByte,
        stepBuffer,
      );
      setStepBuffers((prev) => new Map(prev).set(stepId, updatedBuffer));
    },
    [stepBuffers],
  );

  const parseUrlParams = (steps: StepInfo[], stages: StageInfo[]): boolean => {
    const params = new URLSearchParams(document.location.search.substring(1));
    let selected = params.get("selected-node") || "";
    if (!selected) return false;

    const step = steps.find((s) => s.id === selected);
    const expandedSteps: string[] = [];
    // let expandedStages: string[];

    if (step) {
      selected = step.stageId;
      expandedSteps.push(step.id);
      // expandedStages = getStageNodeHierarchy(step.stageId, stages);
      updateStepConsoleOffset(
        step.id,
        false,
        parseInt(params.get("start-byte") || `${0 - LOG_FETCH_SIZE}`),
      );
    } else {
      // expandedStages = getStageNodeHierarchy(selected, stages);
    }

    setOpenStage(selected);
    setExpandedSteps(expandedSteps);
    return true;
  };

  const getStageNodeHierarchy = (
    nodeId: string,
    stages: StageInfo[],
  ): string[] => {
    for (let stage of stages) {
      if (String(stage.id) === nodeId) return [String(stage.id)];
      if (stage.children && stage.children.length > 0) {
        const childHierarchy = getStageNodeHierarchy(nodeId, stage.children);
        if (childHierarchy.length > 0)
          return [...childHierarchy, String(stage.id)];
      }
    }
    return [];
  };

  const selectDefaultNode = (steps: StepInfo[], stages: StageInfo[]) => {
    const step = getDefaultSelectedStep(steps);
    if (!step) return;
    setOpenStage(step.stageId);
    setExpandedSteps([step.id]);
    setTimeout(() => {
      document
        .getElementById(`stage-tree-icon-${step.stageId}`)
        ?.scrollIntoView();
    }, 0);
  };

  useEffect(() => {
    getStateUpdate().then((data) => {
      setStages(data.stages);
      setSteps(data.steps);

      const usedUrl = parseUrlParams(data.steps, data.stages);
      if (!usedUrl && !openStage) {
        selectDefaultNode(data.steps, data.stages);
      }

      if (!data.isComplete) {
        pollUntilComplete<PipelineStatusInfo>({
          functionToPoll: getStateUpdate,
          checkSuccess: (data) => !!data,
          onSuccess: (data) => {
            setStages(data.stages);
            setSteps(data.steps);
          },
          checkComplete: (data) => data.isComplete ?? false,
          onComplete: () => {},
          interval: 1000,
        });
      }
    });
  }, []);

  const handleStageSelect = (event: React.ChangeEvent<any>, nodeId: string) => {
    const steps = getStageSteps(nodeId);
    const newlyExpandedSteps =
      steps.length > 0 ? [steps[steps.length - 1].id] : [];
    setOpenStage(nodeId);
    setExpandedSteps((prev) => [...prev, ...newlyExpandedSteps]);
    updateStepConsoleOffset(newlyExpandedSteps[0], false, 0 - LOG_FETCH_SIZE);
  };

  // const handleStageToggle = (_: any, nodeIds: string[]) => setExpandedStages(nodeIds);

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
            onNodeSelect={handleStageSelect}
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
};

export default PipelineConsole;
