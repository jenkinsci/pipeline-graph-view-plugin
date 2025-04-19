import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConsoleTextOffset,
  getRunSteps,
  LOG_FETCH_SIZE,
  POLL_INTERVAL,
  StageInfo,
  StepInfo,
  StepLogBufferInfo,
} from "./PipelineConsoleModel";
import useRunPoller from "../../../common/tree-api";

export function useStepsPoller(props: RunPollerProps) {
  const { run } = useRunPoller({
    currentRunPath: props.currentRunPath,
    previousRunPath: props.previousRunPath,
  });

  const [openStage, setOpenStage] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [stages, setaStages] = useState<StageInfo[]>([]);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [stepBuffers, setStepBuffers] = useState(
    new Map<string, StepLogBufferInfo>(),
  );

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
    [],
  );

  const parseUrlParams = useCallback(
    (steps: StepInfo[]): boolean => {
      // const params = new URLSearchParams(document.location.search.substring(1));
      // let selected = params.get("selected-node") || "";
      // if (!selected) return false;
      //
      // const step = steps.find((s) => s.id === selected);
      // const expanded: string[] = [];
      //
      // if (step) {
      //   selected = step.stageId;
      //   expanded.push(step.id);
      //
      //   updateStepConsoleOffset(
      //     step.id,
      //     false,
      //     parseInt(params.get("start-byte") || `${0 - LOG_FETCH_SIZE}`),
      //   );
      // }
      //
      // setOpenStage(selected);
      // setExpandedSteps(expanded);
      return true;
    },
    [updateStepConsoleOffset],
  );

  // const selectDefaultNode = useCallback((steps: StepInfo[]) => {
  //   const step = steps.find((s) => s !== undefined);
  //   if (!step) return;
  //   setOpenStage(step.stageId);
  //   setExpandedSteps([step.id]);
  //
  //   setTimeout(() => {
  //     document
  //       .getElementById(`stage-tree-icon-${step.stageId}`)
  //       ?.scrollIntoView();
  //   }, 0);
  // }, []);

  //
  useEffect(() => {
    setaStages(run?.stages ?? []);
  }, [run]);

  useEffect(() => {
    getRunSteps().then((steps) => {
      steps = steps || [];
      setSteps(steps);

      const usedUrl = parseUrlParams(steps);
      // if (!usedUrl && !openStage) {
      //   selectDefaultNode(steps);
      // }

      if (!run?.complete) {
        startPollingPipeline({
          getStateUpdateFn: getRunSteps,
          onData: (data) => {
            const hasNewSteps =
              JSON.stringify(stepsRef.current) !== JSON.stringify(data);

            if (hasNewSteps) {
              setSteps(data);
              stepsRef.current = data;
            }
          },
          checkComplete: () => !run?.complete,
          interval: POLL_INTERVAL,
        });
      }
    });
  }, [stages]);

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

  const handleStepToggle = (nodeId: string) => {
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

/**
 * Starts polling a function until a complete condition is met.
 */
export const startPollingPipeline = ({
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
