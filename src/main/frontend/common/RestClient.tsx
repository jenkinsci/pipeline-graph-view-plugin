import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

export interface RunStatus {
  stages: StageInfo[];
  isComplete: boolean;
}

/**
 * StageInfo is the input, in the form of an Array<StageInfo> of the top-level stages of a pipeline
 */
export interface StepInfo {
  name: string;
  title: string;
  state: Result;
  completePercent: number;
  id: string;
  type: string;
  stageId: string;
  pauseDurationMillis: string;
  startTimeMillis: string;
  totalDurationMillis: string;
}

// Internal representation of console log.
export interface StepLogBufferInfo {
  lines: string[];
  startByte: number;
  endByte: number;
}

export interface UserPreferences {
  timezone: string;
}

// Returned from API, gets converted to 'StepLogBufferInfo'.
export interface ConsoleLogData {
  text: string;
  startByte: number;
  endByte: number;
}

export async function getRunStatus(): Promise<RunStatus | null> {
  try {
    let response = await fetch("tree");
    if (!response.ok) throw response.statusText;
    let json = await response.json();
    if (json.data.hasOwnProperty("complete")) {
      // The API returned 'complete' but we expect 'isComplete'.
      if ("complete" in json.data) {
        json.data["isComplete"] = json.data["complete"];
        delete json.data["complete"];
      }
      if (!("isComplete" in json.data)) {
        console.error("Did not get 'complete' status from API.");
      }
    }
    return json.data;
  } catch (e) {
    console.error(`Caught error getting tree: '${e}'`);
    return null;
  }
}

export async function getRunSteps(): Promise<StepInfo[] | null> {
  try {
    let response = await fetch("allSteps");
    if (!response.ok) throw response.statusText;
    let json = await response.json();
    return json.data;
  } catch (e) {
    console.warn(`Caught error getting steps: '${e}'`);
    return null;
  }
}

export async function getConsoleTextOffset(
  stepId: string,
  startByte: number
): Promise<ConsoleLogData | null> {
  try {
    let response = await fetch(
      `consoleOutput?nodeId=${stepId}&startByte=${startByte}`
    );
    if (!response.ok) throw response.statusText;
    let json = await response.json();
    json.data.text = json.data.text;
    return json.data;
  } catch (e) {
    console.error(`Caught error when fetching console: '${e}'`);
    return null;
  }
}

export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const response = await fetch('multi-pipeline-graph/userPreferences'); // TODO: ew
    if (!response.ok) { throw response.statusText }

    const json = await response.json();
    return json.data;
  } catch (e) {
    console.error(`Caught error when fetching user preferences: '${e}'`);
    return { timezone: 'UTC' };
  }
}
