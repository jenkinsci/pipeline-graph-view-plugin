import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import RunEstimator from "./run-estimator.ts";

const previous: StageInfo[] = [
  makeStage("success", Result.success, 1000),
  makeStage("failure", Result.failure, 2000),
];

function makeStage(name: string, state: Result, duration: number): StageInfo {
  return {
    name,
    state,
    totalDurationMillis: duration,
    completePercent: 0,
    title: "",
    id: 0,
    type: "STAGE",
    children: [],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    agent: "",
    url: "",
  };
}

describe("Run Estimator", () => {
  let estimator: RunEstimator;

  beforeEach(() => {
    estimator = new RunEstimator(previous);
  });

  describe("Estimate Completion", () => {
    const finishedStates = [
      Result.success,
      Result.unstable,
      Result.failure,
      Result.unknown,
      Result.aborted,
      Result.skipped,
      Result.not_built,
    ];
    const runningStates = [Result.running, Result.paused];
    const others = Object.keys(Result)
      .map((r) => Result[r as keyof typeof Result])
      .filter((r) => !finishedStates.includes(r) && !runningStates.includes(r));

    finishedStates.forEach((state) => {
      describe(`Current Stage State = ${state}`, () => {
        it(`should return 100% for current stage`, () => {
          const stage = makeStage("finished", state, 1000);
          expect(estimator.estimateCompletion(stage)).toEqual(100);
        });
      });
    });

    runningStates.forEach((state) => {
      describe(`Current Stage State = ${state}`, () => {
        it(`should return 0% when the current stage does not match a previous stage`, () => {
          const stage = makeStage("unknown", state, 1000);
          expect(estimator.estimateCompletion(stage)).toEqual(0);
        });

        it(`should return 99% when the current stage has been going longer than the previous stage`, () => {
          const stage = makeStage("success", state, 1001);
          expect(estimator.estimateCompletion(stage)).toEqual(99);
        });

        it(`should return 99% when the current stage has been going for the same time as the previous stage`, () => {
          const stage = makeStage("success", state, 1000);
          expect(estimator.estimateCompletion(stage)).toEqual(99);
        });

        it("should return the percentage complete when the current stage has been going for less time than the previous stage", () => {
          const stage = makeStage("success", state, 50);
          expect(estimator.estimateCompletion(stage)).toEqual(5);
        });
      });
    });

    others.forEach((state) => {
      describe(`Current Stage State = ${state} (it is not a known finished or running state)`, () => {
        it(`should return 0% for current stage`, () => {
          const stage = makeStage("success", state, 1000);
          expect(estimator.estimateCompletion(stage)).toEqual(0);
        });
      });
    });
  });
});
