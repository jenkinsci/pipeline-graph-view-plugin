import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useRunPoller from "../../../../common/tree-api.ts";
import { refreshStagesFromSteps } from "../../../../common/utils/refresh-stages-from-steps.ts";
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
  startByte: number,
): Promise<void> {
  const isTailing = startByte === TAIL_CONSOLE_LOG;
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
    if (newLogLines.length > 0) {
      stepBuffer.lines.length -= exceptionText.length;
      if (
        !stepBuffer.hasTrailingNewLine &&
        stepBuffer.lines.length > 0 &&
        newLogLines.length > 0
      ) {
        // Combine a previously broken up line back together.
        stepBuffer.lines[stepBuffer.lines.length - 1] += newLogLines.shift();
      }
      stepBuffer.lines = [
        ...stepBuffer.lines,
        ...newLogLines,
        ...exceptionText,
      ];
    }
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

function getDefaultSelectedStep(steps: StepInfo[], runIsComplete: boolean) {
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
          runIsComplete &&
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
}

async function fetchStepLogDetail(
  stepBuffers: Map<string, StepLogBufferInfo>,
  stepId: string,
  queue: "pending" | "pendingExceptionText",
  fn: (stepBuffer: StepLogBufferInfo) => Promise<void>,
): Promise<StepLogBufferInfo> {
  let stepBuffer = stepBuffers.get(stepId);
  if (!stepBuffer) {
    stepBuffer = { lines: [], startByte: 0, endByte: TAIL_CONSOLE_LOG };
    stepBuffers.set(stepId, stepBuffer);
  }
  // Cheap FIFO queue to avoid duplicate fetches.
  const promise = (stepBuffer[queue] || Promise.resolve()).finally(() =>
    fn(stepBuffer),
  );
  stepBuffer[queue] = promise;
  try {
    await promise;
  } finally {
    if (stepBuffer[queue] === promise) {
      delete stepBuffer[queue];
    }
  }
  return stepBuffer;
}

export function useStepsPoller(props: RunPollerProps) {
  const { run, loading } = useRunPoller({
    currentRunPath: props.currentRunPath,
    previousRunPath: props.previousRunPath,
  });
  const {
    data: { steps, runIsComplete },
  } = usePolling<AllStepsData>(getRunSteps, POLL_INTERVAL, "runIsComplete", {
    steps: [],
    runIsComplete: false,
  });
  run.stages = refreshStagesFromSteps(run.stages, steps);

  const [openStageId, setOpenStageId] = useState("");
  const openStage = useMemo(() => {
    const findStage = (stages: StageInfo[]): StageInfo | null => {
      for (const stage of stages) {
        if (String(stage.id) === openStageId) return stage;
        if (stage.children.length > 0) {
          const result = findStage(stage.children);
          if (result) return result;
        }
      }
      return null;
    };
    return openStageId ? findStage(run.stages) : null;
  }, [run.stages, openStageId]);
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const collapsedSteps = useRef(new Set<string>());
  const tailStep = useRef("");

  const [tailLogs, setTailLogs] = useState(true);
  const [tailStage, setTailStage] = useState("");
  // Make the latest tailLogs state available without a re-render.
  const tailLogsRef = useRef(tailLogs);
  const startTailingLogs = useCallback(() => {
    history.replaceState({}, "", "?"); // Unset query parameters.
    scrollToStepOnce.current = ""; // Unset from manually selected node.
    tailLogsRef.current = true;
    setTailLogs(true);
    if (openStage?.state === "running") {
      // Keep tailing in the current stage.
      setTailStage(openStageId);
    } else {
      // Select the next best stage using the default step.
      setTailStage("");
    }
  }, [openStageId, openStage?.state]);
  const stopTailingLogs = useCallback(() => {
    scrollToStepOnce.current = "";
    tailLogsRef.current = false;
    setTailLogs(false);
    setTailStage("");
  }, []);

  // "scroll" events do not have a flag for telling "user has scrolled" vs programmatic "element.scrollIntoView()" apart.
  // On a best-effort basis, we can infer from our state changes/DOM actions what was likely a programmatic event vs user action.
  const programmaticScroll = useRef(false);
  const switchingStage = useRef(false);
  useEffect(() => {
    if (!tailLogs) return;
    programmaticScroll.current = false;
    const handleScroll = () => {
      if (programmaticScroll.current) {
        programmaticScroll.current = false;
      } else if (switchingStage.current) {
        switchingStage.current = false;
      } else {
        // The user has scrolled.
        stopTailingLogs();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [stopTailingLogs, tailLogs]);

  useEffect(() => {
    if (!tailLogs) return;
    // Best effort to avoid false-positives when switching stages during tailing.
    // The incoming stage may be shorter and we will get a "scroll" event when the DOM changes.
    // The timing for the "scroll" event is up to the browser. Put an optimistic limit of 100ms in place to handle the case of no need to scroll.
    // In case we picked a limit that was too low, the tailing will stop early. The user can resume the tailing via the TailLogsButton.
    // Picking a limit that is too high will result in continuous tailing despite the user scrolling. The user can stop the tailing via the TailLogsButton.
    switchingStage.current = true;
    let timer = 0;
    const cleanup = () => {
      switchingStage.current = false;
      clearTimeout(timer);
      window.removeEventListener("scroll", cleanup);
    };
    timer = window.setTimeout(cleanup, 100);
    window.addEventListener("scroll", cleanup);
    return () => cleanup();
  }, [tailLogs, openStageId]);

  const scrollToStepOnce = useRef("");
  const scrollToTail = useCallback(
    (stepId: string, element: HTMLDivElement) => {
      const scrollDefaultStep =
        tailLogsRef.current && stepId === tailStep.current;
      if (!scrollDefaultStep) {
        if (stepId !== scrollToStepOnce.current) return;
        const stepBuffer = stepBuffersRef.current.get(stepId);
        if (!stepBuffer || stepBuffer.endByte === TAIL_CONSOLE_LOG) {
          // The initial fetch is still pending, avoid jumping back and forth.
          return;
        }
        scrollToStepOnce.current = "";
      }
      programmaticScroll.current = true;
      element.scrollIntoView({ block: "end" });
    },
    [],
  );

  const stepBuffersRef = useRef(new Map<string, StepLogBufferInfo>());
  const fetchLogText = useCallback((stepId: string, startByte: number) => {
    return fetchStepLogDetail(
      stepBuffersRef.current,
      stepId,
      "pending",
      (stepBuffer) => updateStepBuffer(stepBuffer, stepId, startByte),
    );
  }, []);

  const fetchExceptionText = useCallback((stepId: string) => {
    return fetchStepLogDetail(
      stepBuffersRef.current,
      stepId,
      "pendingExceptionText",
      async (stepBuffer: StepLogBufferInfo) => {
        if (stepBuffer.exceptionText?.length) return; // Already fetched
        stepBuffer.exceptionText = await getExceptionText(stepId);
        stepBuffer.lines = stepBuffer.lines.concat(stepBuffer.exceptionText);
      },
    );
  }, []);

  const expandLastStageStep = useCallback(
    (steps: StepInfo[], stageId: string) => {
      const stepsForStage = steps.filter((step) => step.stageId === stageId);
      if (stepsForStage.length === 0) return;

      const lastStep = stepsForStage[stepsForStage.length - 1];
      if (collapsedSteps.current.has(lastStep.id)) return;

      scrollToStepOnce.current = lastStep.id;
      setExpandedSteps([lastStep.id]);
    },
    [],
  );

  const parsedURLParams = useRef(false);
  useEffect(() => {
    if (parsedURLParams.current || steps.length === 0) return;
    parsedURLParams.current = true;
    const params = new URLSearchParams(document.location.search.substring(1));
    let selected = params.get("selected-node");
    if (!selected) return;
    stopTailingLogs();

    const step = steps.find((s) => s.id === selected);
    if (step) {
      selected = step.stageId;
      scrollToStepOnce.current = step.id;
      setExpandedSteps([step.id]);
      const startByteParam = params.get("start-byte");
      if (startByteParam) {
        const startByte = parseInt(startByteParam);
        stepBuffersRef.current.set(step.id, {
          lines: [],
          startByte,
          endByte: startByte,
        });
      }
    } else {
      expandLastStageStep(steps, selected);
    }

    setOpenStageId(selected);
  }, [steps, expandLastStageStep, stopTailingLogs]);

  useEffect(() => {
    let defaultStep;
    if (tailStage) {
      defaultStep = steps.filter((s) => s.stageId === tailStage).pop() || null;
      if (
        defaultStep &&
        defaultStep.state !== "running" &&
        stepBuffersRef.current.get(defaultStep.id)?.stopTailing
      ) {
        // Tailed in full. Let the user resume tailing in another stage.
        stopTailingLogs();
      }
    } else {
      defaultStep = getDefaultSelectedStep(steps, runIsComplete);
    }
    if (!defaultStep) return;
    tailStep.current = defaultStep.id;
    if (!tailLogsRef.current) return;
    setOpenStageId(defaultStep.stageId);
    if (collapsedSteps.current.has(defaultStep.id)) return;
    setExpandedSteps((prev) => {
      if (prev.includes(defaultStep.id)) return prev;
      return [...prev, defaultStep.id];
    });
  }, [steps, tailLogs, runIsComplete, tailStage, stopTailingLogs]);

  const handleStageSelect = useCallback(
    (nodeId: string) => {
      stopTailingLogs();

      if (!nodeId) return;
      if (nodeId === openStageId) return; // skip if already selected

      history.replaceState({}, "", `?selected-node=` + nodeId);

      setOpenStageId(nodeId);
      expandLastStageStep(steps, nodeId);
    },
    [openStageId, steps, stopTailingLogs, expandLastStageStep],
  );

  const onStepToggle = useCallback(
    (nodeId: string) => {
      stopTailingLogs();
      setExpandedSteps((expandedSteps) => {
        if (!expandedSteps.includes(nodeId)) {
          collapsedSteps.current.delete(nodeId);
          return [...expandedSteps, nodeId];
        } else {
          collapsedSteps.current.add(nodeId);
          return expandedSteps.filter((id) => id !== nodeId);
        }
      });
    },
    [stopTailingLogs],
  );

  const openStageSteps = useMemo(() => {
    return steps.filter((step) => step.stageId === openStageId);
  }, [steps, openStageId]);

  return {
    openStage,
    openStageSteps,
    stepBuffers: stepBuffersRef.current,
    expandedSteps,
    complete: runIsComplete,
    stages: run.stages,
    handleStageSelect,
    onStepToggle,
    fetchLogText,
    fetchExceptionText,
    loading,
    tailLogs,
    scrollToTail,
    startTailingLogs,
    stopTailingLogs,
  };
}

interface RunPollerProps {
  currentRunPath: string;
  previousRunPath?: string;
}
