import { StageInfo } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { StepInfo } from "../RestClient.tsx";

export function refreshStagesFromSteps(stages: StageInfo[], steps: StepInfo[]) {
  let changed = false;
  for (let idx = 0; idx < stages.length; idx++) {
    const stage = stages[idx];
    const children = refreshStagesFromSteps(stage.children, steps);
    const stageId = String(stage.id);
    const stageSteps = steps.filter((s) => s.stageId === stageId);
    let { state, startTimeMillis, totalDurationMillis } = stage;
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
    if (
      stage.children !== children ||
      stage.startTimeMillis !== startTimeMillis ||
      stage.state !== state ||
      stage.totalDurationMillis !== totalDurationMillis
    ) {
      // Update in-place to avoid frequent re-render, then trigger re-render.
      stage.children = children;
      stage.startTimeMillis = startTimeMillis;
      stage.state = state;
      stage.totalDurationMillis = totalDurationMillis;
      if (!changed) stages = stages.slice();
      changed = true;
      stages[idx] = { ...stage };
    }
  }
  return stages;
}
