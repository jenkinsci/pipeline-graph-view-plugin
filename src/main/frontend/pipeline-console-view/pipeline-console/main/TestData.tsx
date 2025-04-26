import { Result, StageType, StageInfo, StepInfo } from "./PipelineConsoleModel.tsx";
export const defaultStagesList: StageInfo[] = [
  {
    name: "Stage A",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 0,
    type: "STAGE" as StageType,
    children: [],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    agent: "built-in",
    url: "?selected-node=0",
  },
  {
    name: "Stage B",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 1,
    type: "STAGE" as StageType,
    children: [],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    agent: "not-built-in",
    url: "?selected-node=1",
  },
  {
    name: "Parent C",
    title: "",
    state: Result.success,
    completePercent: 50,
    id: 2,
    type: "PARALLEL_BLOCK" as StageType,
    children: [
      {
        name: "Child D",
        title: "",
        state: Result.success,
        completePercent: 50,
        id: 3,
        type: "PARALLEL" as StageType,
        children: [] as StageInfo[],
        pauseDurationMillis: 0,
        startTimeMillis: 0,
        totalDurationMillis: 0,
        agent: "not-built-in",
        url: "?selected-node=3",
      },
    ],
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    agent: "built-in",
    url: "?selected-node=2",
  },
];

export const allSuccessfulStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.success,
    completePercent: 50,
    id: "10",
    type: "STEP",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "0",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.success,
    completePercent: 50,
    id: "11",
    type: "STEP",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is a parallel step",
    title: "Dummy Parallel Step 1",
    state: Result.success,
    completePercent: 50,
    id: "20",
    type: "STEP",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "3",
  },
  {
    name: "This is step 2",
    title: "Dummy Parallel Step 2",
    state: Result.success,
    completePercent: 50,
    id: "21",
    type: "STEP",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "3",
  },
];

export const multipleErrorsStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.success,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.failure,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 3",
    title: "Dummy Step 3",
    state: Result.failure,
    completePercent: 50,
    id: "12",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
];

export const unstableThenFailureStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.unknown,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.unstable,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 3",
    title: "Dummy Step 3",
    state: Result.failure,
    completePercent: 50,
    id: "12",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
];

export const runningStepList: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.success,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.unstable,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 3",
    title: "Dummy Step 3",
    state: Result.running,
    completePercent: 50,
    id: "12",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
];

export const multipleRunningSteps: StepInfo[] = [
  {
    name: "This is step 1",
    title: "Dummy Step 1",
    state: Result.running,
    completePercent: 50,
    id: "10",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
  {
    name: "This is step 2",
    title: "Dummy Step 2",
    state: Result.running,
    completePercent: 50,
    id: "11",
    type: "STAGE",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "1",
  },
];

export const findStage = (
  stageList: Array<StageInfo>,
  id: number,
): StageInfo | null => {
  for (let stage of stageList) {
    if (stage.id == id) {
      return stage;
    }
    if (stage.children) {
      let foundStage = findStage(stage.children, id);
      if (foundStage) {
        return foundStage;
      }
    }
  }
  return null;
};

export const findStageSteps = (
  stepList: Array<StepInfo>,
  id: number,
): StepInfo[] => {
  let steps = [] as StepInfo[];
  for (let step of stepList) {
    if (step.stageId == `${id}`) {
      steps.push(step);
    }
  }
  return steps;
};
