import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

export interface RunStatus {
  stages: StageInfo[];
  complete: boolean;
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
  pauseDurationMillis: number;
  startTimeMillis: number;
  totalDurationMillis: number;
}

// Internal representation of console log.
export interface StepLogBufferInfo {
  lines: string[];
  startByte: number;
  endByte: number;
}

// Returned from API, gets converted to 'StepLogBufferInfo'.
export interface ConsoleLogData {
  text: string;
  startByte: number;
  endByte: number;
}

export async function getRunStatusFromPath(
  url: string,
): Promise<RunStatus | null> {
  try {
    const response = await fetch(url + "/pipeline-graph/tree");
    if (!response.ok) {
      throw response.statusText;
    }
    let json = await response.json();
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
    return json.data.steps;
  } catch (e) {
    console.warn(`Caught error getting steps: '${e}'`);
    return null;
  }
}

export async function getConsoleTextOffset(
  stepId: string,
  startByte: number,
): Promise<ConsoleLogData | null> {
  try {
    let response = await fetch(
      `consoleOutput?nodeId=${stepId}&startByte=${startByte}`,
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
