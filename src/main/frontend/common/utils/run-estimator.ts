import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main";

export default class RunEstimator {
  private stagesLookup: Map<String, StageInfo>;

  constructor(stages: StageInfo[]) {
    this.stagesLookup = new Map(stages.map((stage) => [stage.name, stage]));
  }

  estimateCompletion(stage: StageInfo): number {
    switch (stage.state) {
      // BlueRunResult (implies BlueRunState == FINISHED)
      case Result.success:
      case Result.unstable:
      case Result.failure:
      case Result.unknown:
      case Result.aborted:
      // BlueRunState
      case Result.skipped:
      case Result.not_built: // not sure???
        return 100;
      case Result.running:
      case Result.paused:
        const previous = this.stagesLookup.get(stage.name);
        if (previous === undefined) {
          return 0; // No previous run, so no estimate
        }
        const previousTiming = previous.totalDurationMillis;
        const currentTiming = stage.totalDurationMillis;
        if (previousTiming <= currentTiming) {
          return 99; // Assume 99% complete if the previous run was longer than the current run
        }
        return (currentTiming / previousTiming) * 100;
      default:
        return 0;
    }
  }
}
