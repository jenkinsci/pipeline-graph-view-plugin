import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConsoleTextOffset,
  getRunStatus,
  getRunSteps,
  LOG_FETCH_SIZE,
  POLL_INTERVAL,
  RunStatus,
  StageInfo,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel";

/**
 * TODO
 */
export function usePipelineState() {
  const [openStage, setOpenStage] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [stepBuffers, setStepBuffers] = useState(
    new Map<string, StepLogBufferInfo>(),
  );

  const stagesRef = useRef<StageInfo[]>([]);
  const stepsRef = useRef<StepInfo[]>([]);

  const updateStepConsoleOffset = useCallback(
    async (stepId: string, forceUpdate: boolean, startByte: number) => {
      let stepBuffer = stepBuffers.get(stepId) ?? {
        lines: [],
        startByte: 0 - LOG_FETCH_SIZE,
        endByte: -1,
        stepId,
      };
      if (stepBuffer.startByte > 0 && !forceUpdate) return;
      const response = await getConsoleTextOffset(stepId, startByte);
      if (!response) return;

      const newLogLines = response.text.trim().split("\n") || [];

      if (stepBuffer.endByte > 0 && stepBuffer.endByte <= startByte) {
        stepBuffer.lines = [...stepBuffer.lines, ...newLogLines];
      } else {
        stepBuffer.lines = newLogLines;
        stepBuffer.startByte = response.startByte;
      }

      stepBuffer.endByte = response.endByte;

      setStepBuffers((prev) => new Map(prev).set(stepId, stepBuffer));
    },
    [stepBuffers],
  );

  const parseUrlParams = useCallback(
    (steps: StepInfo[], stages: StageInfo[]): boolean => {
      const params = new URLSearchParams(document.location.search.substring(1));
      let selected = params.get("selected-node") || "";
      if (!selected) return false;

      const step = steps.find((s) => s.id === selected);
      const expanded: string[] = [];

      if (step) {
        selected = step.stageId;
        expanded.push(step.id);

        updateStepConsoleOffset(
          step.id,
          false,
          parseInt(params.get("start-byte") || `${0 - LOG_FETCH_SIZE}`),
        );
      }

      setOpenStage(selected);
      setExpandedSteps(expanded);
      return true;
    },
    [updateStepConsoleOffset],
  );

  const selectDefaultNode = useCallback(
    (steps: StepInfo[], stages: StageInfo[]) => {
      const step = steps.find((s) => s !== undefined);
      if (!step) return;
      setOpenStage(step.stageId);
      setExpandedSteps([step.id]);

      setTimeout(() => {
        document
          .getElementById(`stage-tree-icon-${step.stageId}`)
          ?.scrollIntoView();
      }, 0);
    },
    [],
  );

  // TODO - refine
  function isEqual(idk: any, idk2: any) {
    return JSON.stringify(idk) === JSON.stringify(idk2);
  }

  function mergeStages(
    prevStages: StageInfo[],
    newStages: StageInfo[],
  ): StageInfo[] {
    const prevMap = new Map(prevStages.map((s) => [s.id, s]));

    return newStages.map((newStage) => {
      const prevStage = prevMap.get(newStage.id);

      // If we have a previous stage, compare deeply
      if (prevStage) {
        const children = mergeStages(
          prevStage.children,
          newStage.children || [],
        );

        const changed =
          !isEqual(
            { ...prevStage, children: undefined },
            { ...newStage, children: undefined },
          ) || children !== prevStage.children;

        if (changed) {
          return { ...newStage, children };
        } else {
          return prevStage; // reuse previous ref to skip re-render
        }
      }

      // New stage
      return newStage;
    });
  }

  useEffect(() => {
    getStateUpdate().then((data) => {
      setStages(data.stages);
      setSteps(data.steps);
      stagesRef.current = data.stages;
      stepsRef.current = data.steps;

      const usedUrl = parseUrlParams(data.steps, data.stages);
      if (!usedUrl && !openStage) {
        selectDefaultNode(data.steps, data.stages);
      }

      if (!data.isComplete) {
        // TODO - Tidy up, have startPollingPipeline have an initial delay?
        // No point instantly polling after we've _just_ polled
        setTimeout(() => {
          startPollingPipeline({
            getStateUpdateFn: getStateUpdate,
            onData: (data) => {
              const hasNewStages =
                JSON.stringify(stagesRef.current) !==
                JSON.stringify(data.stages);
              const hasNewSteps =
                JSON.stringify(stepsRef.current) !== JSON.stringify(data.steps);

              if (hasNewStages) {
                setStages((prev) => {
                  const merged = mergeStages(prev, data.stages);
                  if (merged === prev) return prev; // no change, no re-render
                  stagesRef.current = merged;
                  console.log("Setting stages!", merged[-1]);
                  return merged;
                });
                stagesRef.current = data.stages;
              }

              if (hasNewSteps) {
                setSteps(data.steps);
                stepsRef.current = data.steps;
              }
            },
            checkComplete: (data) => data.isComplete ?? false,
            interval: POLL_INTERVAL,
          });
        }, POLL_INTERVAL);
      }
    });
  }, []);

  const handleStageSelect = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;
      if (nodeId === openStage) return; // skip if already selected

      const stepsForStage = steps.filter((step) => step.stageId === nodeId);
      const lastStep = stepsForStage[stepsForStage.length - 1];
      const newlyExpandedSteps = lastStep ? [lastStep.id] : [];

      setOpenStage(nodeId);
      setExpandedSteps((prev) => [...prev, ...newlyExpandedSteps]);

      if (lastStep) {
        updateStepConsoleOffset(lastStep.id, false, 0 - LOG_FETCH_SIZE);
      }
    },
    [openStage, steps, updateStepConsoleOffset],
  );

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

  return {
    openStage: getOpenStage(),
    openStageSteps: getStageSteps(openStage),
    openStageStepBuffers: getStageStepBuffers(openStage),
    expandedSteps,
    stages,
    handleStageSelect,
    handleStepToggle,
    handleMoreConsoleClick,
  };
}

export interface PipelineStatusInfo extends RunStatus {
  steps: StepInfo[];
  stages: StageInfo[];
}

/**
 * Fetches the latest pipeline state from the API.
 */
export const getStateUpdate = async (): Promise<PipelineStatusInfo> => {
  const [runStatus, runSteps] = await Promise.all([
    getRunStatus(),
    getRunSteps(),
  ]);

  return {
    ...(runStatus ?? { isComplete: false, stages: [] }),
    ...(runSteps ?? { steps: [] }),
  } as PipelineStatusInfo;
};

/**
 * Starts polling a function until a complete condition is met.
 */
export const startPollingPipeline = ({
  getStateUpdateFn,
  onData,
  checkComplete,
  interval = 1000,
}: {
  getStateUpdateFn: () => Promise<PipelineStatusInfo>;
  onData: (data: PipelineStatusInfo) => void;
  checkComplete: (data: PipelineStatusInfo) => boolean;
  interval?: number;
}): (() => void) => {
  let polling = true;

  const poll = async () => {
    while (polling) {
      const data = await getStateUpdateFn();
      onData(data);

      if (checkComplete(data)) {
        polling = false;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  };

  poll();

  return () => {
    polling = false;
  };
};
