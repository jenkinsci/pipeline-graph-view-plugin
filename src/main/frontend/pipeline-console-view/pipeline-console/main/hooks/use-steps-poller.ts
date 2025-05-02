import { useCallback, useEffect, useRef, useState } from "react";

import useRunPoller from "../../../../common/tree-api.ts";
import {
  getConsoleTextOffset,
  getRunSteps,
  LOG_FETCH_SIZE,
  POLL_INTERVAL,
  Result,
  StageInfo,
  StepInfo,
  StepLogBufferInfo,
} from "../PipelineConsoleModel.tsx";

export function useStepsPoller(props: RunPollerProps) {
  const { run, loading } = useRunPoller({
    currentRunPath: props.currentRunPath,
    previousRunPath: props.previousRunPath,
  });

  const [openStage, setOpenStage] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [stepBuffers, setStepBuffers] = useState(
    new Map<string, StepLogBufferInfo>(),
  );
  const [userManuallySetNode, setUserManuallySetNode] = useState(false);

  const stepsRef = useRef<StepInfo[]>([]);

  const updateStepConsoleOffset = useCallback(
    async (stepId: string, forceUpdate: boolean, startByte: number) => {
      const stepBuffer = stepBuffers.get(stepId) ?? {
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
    [],
  );

  const parseUrlParams = useCallback(
    (steps: StepInfo[]): boolean => {
      const params = new URLSearchParams(document.location.search.substring(1));
      let selected = params.get("selected-node");
      if (!selected) {
        return false;
      }

      setUserManuallySetNode(true);

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

  const getDefaultSelectedStep = (steps: StepInfo[]) => {
    if (userManuallySetNode) {
      return;
    }

    let selectedStep = steps.find((step) => step !== undefined);
    if (!steps || steps.length === 0 || !selectedStep) {
      return null;
    }
    for (const step of steps) {
      const stepResult = step.state.toLowerCase() as Result;
      const selectedStepResult = selectedStep?.state.toLowerCase() as Result;
      switch (stepResult) {
        case Result.running:
        case Result.queued:
        case Result.paused:
          // Return first running/queued/paused step.
          return step;
        case Result.unstable:
        case Result.failure:
        case Result.aborted:
          if (selectedStepResult && stepResult < selectedStepResult) {
            // Return first unstable/failed/aborted step which has a state worse than the selectedStep.
            // E.g. if the first step state is failure we want to return that over a later unstable step.
            return step;
          }
          continue;
        default:
          // Otherwise select the step with the worst result with the largest id - e.g. (last step if all successful).
          if (selectedStepResult && stepResult <= selectedStepResult) {
            selectedStep = step;
          }
      }
    }
    return selectedStep;
  };

  useEffect(() => {
    getRunSteps()
      .then((steps) => {
        steps = steps || [];
        setSteps(steps);

        const usedUrl = parseUrlParams(steps);
        if (!usedUrl) {
          const defaultStep = getDefaultSelectedStep(steps);
          if (defaultStep) {
            setOpenStage(defaultStep.stageId);

            if (defaultStep.stageId) {
              setExpandedSteps((prev) => [...prev, defaultStep.id]);
              updateStepConsoleOffset(
                defaultStep.id,
                false,
                0 - LOG_FETCH_SIZE,
              );
            }
          }
        }

        if (!run?.complete) {
          startPollingPipeline({
            getStateUpdateFn: getRunSteps,
            onData: (data) => {
              const hasNewSteps =
                JSON.stringify(stepsRef.current) !== JSON.stringify(data);

              if (userManuallySetNode) {
                const defaultStep = getDefaultSelectedStep(steps);
                if (defaultStep) {
                  setOpenStage(defaultStep.stageId);

                  if (defaultStep.stageId) {
                    setExpandedSteps((prev) => [...prev, defaultStep.id]);
                    updateStepConsoleOffset(
                      defaultStep.id,
                      false,
                      0 - LOG_FETCH_SIZE,
                    );
                  }
                }
              }

              if (hasNewSteps) {
                setSteps(data);
                stepsRef.current = data;
              }
            },
            checkComplete: () => !run?.complete,
            interval: POLL_INTERVAL,
          });
        }
        return null;
      })
      .catch((error) => {
        console.error("Error in getRunSteps:", error);
      });
  }, [run?.stages]);

  const handleStageSelect = useCallback(
    (nodeId: string) => {
      setUserManuallySetNode(true);

      if (!nodeId) return;
      if (nodeId === openStage) return; // skip if already selected

      const stepsForStage = steps.filter((step) => step.stageId === nodeId);
      const lastStep = stepsForStage[stepsForStage.length - 1];
      const newlyExpandedSteps = lastStep ? [lastStep.id] : [];

      history.replaceState({}, "", `?selected-node=` + nodeId);

      setOpenStage(nodeId);
      setExpandedSteps((prev) => [...prev, ...newlyExpandedSteps]);

      if (lastStep) {
        updateStepConsoleOffset(lastStep.id, false, 0 - LOG_FETCH_SIZE);
      }
    },
    [openStage, steps, updateStepConsoleOffset],
  );

  const onStepToggle = (nodeId: string) => {
    setUserManuallySetNode(true);
    if (!expandedSteps.includes(nodeId)) {
      setExpandedSteps((prev) => [...prev, nodeId]);
      updateStepConsoleOffset(nodeId, false, 0 - LOG_FETCH_SIZE);
    } else {
      setExpandedSteps((prev) => prev.filter((id) => id !== nodeId));
    }
  };

  const onMoreConsoleClick = (nodeId: string, startByte: number) => {
    updateStepConsoleOffset(nodeId, true, startByte);
  };

  const getStageSteps = (stageId: string) => {
    return steps.filter((step) => step.stageId === stageId);
  };

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
      for (const stage of stages) {
        if (String(stage.id) === openStage) return stage;
        if (stage.children.length > 0) {
          const result = findStage(stage.children);
          if (result) return result;
        }
      }
      return null;
    };
    return openStage ? findStage(run?.stages || []) : null;
  };

  return {
    openStage: getOpenStage(),
    openStageSteps: getStageSteps(openStage),
    openStageStepBuffers: getStageStepBuffers(openStage),
    expandedSteps,
    stages: run?.stages || [],
    handleStageSelect,
    onStepToggle,
    onMoreConsoleClick,
    loading,
  };
}

/**
 * Starts polling a function until a complete condition is met.
 */
const startPollingPipeline = ({
  getStateUpdateFn,
  onData,
  checkComplete,
  interval = 1000,
}: {
  getStateUpdateFn: () => Promise<StepInfo[] | null>;
  onData: (data: StepInfo[]) => void;
  checkComplete: (data: StepInfo[]) => boolean;
  interval?: number;
}): (() => void) => {
  let polling = true;

  const poll = async () => {
    while (polling) {
      const data = (await getStateUpdateFn()) || [];
      onData(data);

      if (checkComplete(data)) {
        polling = false;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  };

  setTimeout(poll, interval);

  return () => {
    polling = false;
  };
};

interface RunPollerProps {
  currentRunPath: string;
  previousRunPath?: string;
}
