import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { StepInfo } from "../RestClient.tsx";

export function refreshStagesFromSteps(stages: StageInfo[], steps: StepInfo[]) {
  const stateIsPending = (state: Result) =>
    [Result.running, Result.paused, Result.queued, Result.unknown].includes(
      state,
    );

  let changed = false;
  for (let idx = 0; idx < stages.length; idx++) {
    const stage = stages[idx];
    const children = refreshStagesFromSteps(stage.children, steps);
    const stageId = String(stage.id);
    const stageSteps = steps.filter((s) => s.stageId === stageId);
    let { state, startTimeMillis, totalDurationMillis, pauseLiveTotal } = stage;
    if (stage.skeleton && stageSteps.length > 0) {
      startTimeMillis = stageSteps[0].startTimeMillis;
      state = stageSteps[stageSteps.length - 1].state;
      totalDurationMillis = undefined; // Something has started, hide previous total.
    } else if (stage.skeleton && children.length > 0) {
      startTimeMillis = children[0].startTimeMillis;
      state = children[children.length - 1].state;
      if (startTimeMillis) {
        // Unset in case any child has started, otherwise display previous total.
        totalDurationMillis = undefined;
      }
    }
    // Derived front-end flag: if any step has an inputStep or any child is paused/waiting, mark waitingForInput.
    const waitingForInput =
      state === Result.running &&
      (stageSteps.some((s) => Boolean(s.inputStep)) ||
        children.some(
          (c) => c.waitingForInput || c.state === Result.paused,
        ));
    // Best effort: Pause timer when a stage is expected to have finished to avoid having to decrement the total duration when done (as confirmed by the next run polling).
    pauseLiveTotal =
      startTimeMillis > 0 &&
      !totalDurationMillis &&
      !stageSteps.find((s) => stateIsPending(s.state)) &&
      !children.find((s) => stateIsPending(s.state) && !s.pauseLiveTotal);
    if (
      stage.children !== children ||
      Boolean(stage.pauseLiveTotal) !== pauseLiveTotal ||
      stage.startTimeMillis !== startTimeMillis ||
      stage.state !== state ||
      stage.totalDurationMillis !== totalDurationMillis ||
      Boolean(stage.waitingForInput) !== waitingForInput
    ) {
      // Update in-place to avoid frequent re-render, then trigger re-render.
      stage.children = children;
      stage.pauseLiveTotal = pauseLiveTotal;
      stage.startTimeMillis = startTimeMillis;
      stage.state = state;
      stage.totalDurationMillis = totalDurationMillis;
      stage.waitingForInput = waitingForInput;
      if (!changed) stages = stages.slice();
      changed = true;
      stages[idx] = { ...stage };
    }
  }
  return stages;
}
