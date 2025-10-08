import { useCallback, useEffect, useRef, useState } from "react";

import useRunPoller from "../../../../common/tree-api.ts";
import { usePolling } from "../../../../common/utils/use-polling.ts";
import {
  AllStepsData,
  getConsoleTextOffset,
  getExceptionText,
  getRunSteps,
  POLL_INTERVAL,
  Result,
  StageInfo,
  StepInfo,
  StepLogBufferInfo,
  TAIL_CONSOLE_LOG,
} from "../PipelineConsoleModel.tsx";

async function updateStepBuffer(
  stepBuffer: StepLogBufferInfo,
  stepId: string,
  forceUpdate: boolean,
  startByte: number,
): Promise<void> {
  const isTailing = startByte === TAIL_CONSOLE_LOG;
  if (stepBuffer.startByte > 0 && !forceUpdate) {
    // This is a large log. Only update the log when requested by the UI.
    return;
  }
  if (isTailing && stepBuffer.stopTailing) {
    // We've already reached the end of the log.
    return;
  }
  if (
    !isTailing &&
    stepBuffer.startByte <= startByte &&
    startByte <= stepBuffer.endByte
  ) {
    // Duplicate click on "There's more to see - XMiB of logs hidden".
    return;
  }
  let consoleAnnotator = "";
  if (isTailing) {
    startByte = stepBuffer.endByte;
    consoleAnnotator = stepBuffer.consoleAnnotator || "";
    if (stepBuffer.lastFetched) {
      // Slow down incremental fetch to POLL_INTERVAL.
      const msSinceLastFetch = performance.now() - stepBuffer.lastFetched;
      const backOff = POLL_INTERVAL - msSinceLastFetch;
      await new Promise((resolve) => setTimeout(resolve, backOff));
    }
  }
  stepBuffer.lastFetched = performance.now();
  const response = await getConsoleTextOffset(
    stepId,
    startByte,
    consoleAnnotator,
  );
  if (!response) {
    // Request failed.
    return;
  }

  const newLogLines = response.text.split("\n");
  const hasTrailingNewLine = response.text.endsWith("\n");
  if (!response.text || hasTrailingNewLine) {
    // Remove trailing empty new line caused by a) splitting an empty string or b) a trailing new line character in the response.
    newLogLines.pop();
  }

  const exceptionText = stepBuffer.exceptionText || [];
  if (stepBuffer.endByte > 0 && stepBuffer.endByte === startByte) {
    stepBuffer.lines.length -= exceptionText.length;
    if (
      !stepBuffer.hasTrailingNewLine &&
      stepBuffer.lines.length > 0 &&
      newLogLines.length > 0
    ) {
      // Combine a previously broken up line back together.
      stepBuffer.lines[stepBuffer.lines.length - 1] += newLogLines.shift();
    }
    stepBuffer.lines = [...stepBuffer.lines, ...newLogLines, ...exceptionText];
  } else {
    stepBuffer.lines = newLogLines.concat(exceptionText);
    stepBuffer.startByte = response.startByte;
  }

  stepBuffer.endByte = response.endByte;
  stepBuffer.consoleAnnotator = response.consoleAnnotator;
  if (response.text) {
    // Only overwrite when more text was available.
    stepBuffer.hasTrailingNewLine = hasTrailingNewLine;
  }
  if (!response.nodeIsActive) {
    // We've reached the end of the log now.
    stepBuffer.stopTailing = true;
  }
}

export function useStepsPoller(props: RunPollerProps) {
  const { run, loading } = useRunPoller({
    currentRunPath: props.currentRunPath,
    previousRunPath: props.previousRunPath,
  });
  const {
    data: { steps },
  } = usePolling<AllStepsData>(getRunSteps, POLL_INTERVAL, "runIsComplete", {
    steps: [],
    runIsComplete: false,
  });

  const [openStage, setOpenStage] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const collapsedSteps = useRef(new Set<string>());
  const [stepBuffers, setStepBuffers] = useState(
    new Map<string, StepLogBufferInfo>(),
  );
  // Avoid invalidating updateStepConsoleOffset on every stepBuffer change.
  const stepBuffersRef = useRef(stepBuffers);
  const updateStepConsoleOffset = useCallback(
    async (stepId: string, forceUpdate: boolean, startByte: number) => {
      const stepBuffers = stepBuffersRef.current;
      let stepBuffer = stepBuffers.get(stepId);
      if (!stepBuffer) {
        stepBuffer = { lines: [], startByte: 0, endByte: TAIL_CONSOLE_LOG };
        stepBuffers.set(stepId, stepBuffer);
      }

      // Cheap FIFO queue to avoid duplicate fetches.
      const promise = (stepBuffer.pending || Promise.resolve()).finally(() =>
        updateStepBuffer(stepBuffer, stepId, forceUpdate, startByte),
      );
      stepBuffer.pending = promise;
      try {
        await promise;
      } finally {
        if (stepBuffer.pending === promise) {
          delete stepBuffer.pending;
        }
      }

      stepBuffersRef.current = new Map(stepBuffers).set(stepId, stepBuffer);
      setStepBuffers(stepBuffersRef.current);
    },
    [],
  );

  const fetchExceptionText = useCallback(async (stepId: string) => {
    const stepBuffers = stepBuffersRef.current;
    let stepBuffer = stepBuffers.get(stepId);
    if (!stepBuffer) {
      stepBuffer = { lines: [], startByte: 0, endByte: TAIL_CONSOLE_LOG };
      stepBuffers.set(stepId, stepBuffer);
    }
    while (stepBuffer.pendingExceptionText) {
      await stepBuffer.pendingExceptionText;
    }
    if (stepBuffer.exceptionText?.length) return; // Already fetched
    const promise = getExceptionText(stepId);
    stepBuffer.pendingExceptionText = promise;
    try {
      stepBuffer.exceptionText = await promise;
    } finally {
      delete stepBuffer.pendingExceptionText;
    }

    stepBuffer.lines = stepBuffer.lines.concat(stepBuffer.exceptionText);

    stepBuffersRef.current = new Map(stepBuffers).set(stepId, stepBuffer);
    setStepBuffers(stepBuffersRef.current);
  }, []);

  const parseUrlParams = useCallback(
    (steps: StepInfo[]): boolean => {
      const params = new URLSearchParams(document.location.search.substring(1));
      let selected = params.get("selected-node");
      if (!selected) {
        return false;
      }
      if (collapsedSteps.current.has(selected)) return true;

      const step = steps.find((s) => s.id === selected);
      if (step) {
        selected = step.stageId;
        setExpandedSteps((prev) => {
          if (prev.includes(step.id)) return prev;
          return [...prev, step.id];
        });

        updateStepConsoleOffset(
          step.id,
          false,
          parseInt(params.get("start-byte") || `${TAIL_CONSOLE_LOG}`),
        );
      }

      setOpenStage(selected);
      return true;
    },
    [updateStepConsoleOffset],
  );

  const getDefaultSelectedStep = useCallback(
    (steps: StepInfo[]) => {
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
            if (
              run.complete &&
              selectedStepResult &&
              stepResult < selectedStepResult
            ) {
              // If the run is complete return first unstable/failed/aborted step which has a state worse
              // than the selectedStep.
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
    },
    [run.complete],
  );

  useEffect(() => {
    const usedUrl = parseUrlParams(steps);
    if (!usedUrl) {
      const defaultStep = getDefaultSelectedStep(steps);
      if (defaultStep) {
        setOpenStage(defaultStep.stageId);

        if (defaultStep.stageId) {
          setExpandedSteps((prev) => [...prev, defaultStep.id]);
          updateStepConsoleOffset(defaultStep.id, false, TAIL_CONSOLE_LOG);
        }
      }
    }
  }, [getDefaultSelectedStep, parseUrlParams, steps, updateStepConsoleOffset]);

  const handleStageSelect = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;
      if (nodeId === openStage) return; // skip if already selected

      const stepsForStage = steps.filter((step) => step.stageId === nodeId);
      const lastStep = stepsForStage[stepsForStage.length - 1];

      history.replaceState({}, "", `?selected-node=` + nodeId);

      setOpenStage(nodeId);
      if (lastStep && !collapsedSteps.current.has(lastStep.id)) {
        setExpandedSteps((prev) => [...prev, lastStep.id]);
        updateStepConsoleOffset(lastStep.id, false, TAIL_CONSOLE_LOG);
      }
    },
    [openStage, steps, updateStepConsoleOffset],
  );

  const onStepToggle = (nodeId: string) => {
    if (!expandedSteps.includes(nodeId)) {
      collapsedSteps.current.delete(nodeId);
      setExpandedSteps((prev) => [...prev, nodeId]);
      updateStepConsoleOffset(nodeId, false, TAIL_CONSOLE_LOG);
    } else {
      collapsedSteps.current.add(nodeId);
      setExpandedSteps((prev) => prev.filter((id) => id !== nodeId));
    }
  };

  const onMoreConsoleClick = useCallback(
    (nodeId: string, startByte: number) => {
      updateStepConsoleOffset(nodeId, true, startByte);
    },
    [updateStepConsoleOffset],
  );

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
    return openStage ? findStage(run.stages) : null;
  };

  return {
    openStage: getOpenStage(),
    openStageSteps: getStageSteps(openStage),
    openStageStepBuffers: getStageStepBuffers(openStage),
    expandedSteps,
    stages: run.stages,
    handleStageSelect,
    onStepToggle,
    onMoreConsoleClick,
    fetchExceptionText,
    loading,
  };
}

interface RunPollerProps {
  currentRunPath: string;
  previousRunPath?: string;
}
