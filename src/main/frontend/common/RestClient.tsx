import {
  Result,
  StageInfo,
} from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { ResourceBundle } from "./i18n/index.ts";

export interface RunStatus {
  stages: StageInfo[];
  complete: boolean;
}

export interface InputStep {
  message: string;
  cancel: string;
  id: string;
  ok: string;
  parameters: boolean;
}

export interface AllStepsData {
  steps: StepInfo[];
  runIsComplete: boolean;
}

/**
 * StageInfo is the input, in the form of an Array<StageInfo> of the top-level stages of a pipeline
 */
export interface StepInfo {
  name: string;
  title: string;
  state: Result;
  completePercent: number;
  inputStep?: InputStep;
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
  pending?: {
    startByte: number;
    promise: Promise<ConsoleLogData | null>;
  };
  fullyFetched?: boolean;
  exceptionText?: string[];
  pendingExceptionText?: Promise<string[]>;
}

// Returned from API, gets converted to 'StepLogBufferInfo'.
export interface ConsoleLogData {
  text: string;
  startByte: number;
  endByte: number;
  nodeIsActive: boolean;
}

export async function getRunStatusFromPath(
  url: string,
): Promise<RunStatus | null> {
  try {
    const response = await fetch(url + "pipeline-overview/tree");
    if (!response.ok) {
      throw response.statusText;
    }
    const json = await response.json();
    return json.data;
  } catch (e) {
    console.error(`Caught error getting tree: '${e}'`);
    return null;
  }
}

export async function getRunSteps(): Promise<AllStepsData | null> {
  try {
    const response = await fetch("allSteps");
    if (!response.ok) throw response.statusText;
    const json = await response.json();
    return json.data;
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
    const response = await fetch(
      `consoleOutput?nodeId=${stepId}&startByte=${startByte}`,
    );
    if (!response.ok) throw response.statusText;
    const json = await response.json();
    return json.data;
  } catch (e) {
    console.error(`Caught error when fetching console: '${e}'`);
    return null;
  }
}

export async function getExceptionText(stepId: string): Promise<string[]> {
  try {
    const response = await fetch(`exceptionText?nodeId=${stepId}`);
    if (!response.ok) throw response.statusText;
    const text = await response.text();
    return text.split("\n");
  } catch (e) {
    console.error(`Caught error when fetching console: '${e}'`);
    return [];
  }
}

export async function getConsoleBuildOutput(): Promise<string | null> {
  try {
    const response = await fetch(`consoleBuildOutput`);
    if (!response.ok) throw response.statusText;
    return await response.text();
  } catch (e) {
    console.error(`Caught error when fetching console: '${e}'`);
    return null;
  }
}

export async function getResourceBundle(
  resource: string,
): Promise<ResourceBundle | undefined> {
  try {
    const baseUrl: string = document.head.dataset.rooturl ?? "";
    const response = await fetch(
      `${baseUrl}/i18n/resourceBundle?baseName=${resource}`,
    );
    if (!response.ok) {
      throw response.statusText;
    }
    return (await response.json()).data;
  } catch (e) {
    console.error(
      `Caught error when fetching resource bundle ${resource}: '${e}'`,
    );
    return undefined;
  }
}
