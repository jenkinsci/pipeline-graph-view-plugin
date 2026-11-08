import { getResourceBundle } from "../RestClient.tsx";
import {
  CompiledMessage,
  MessageContext,
  MessageFormat,
} from "./message-format.ts";

export type ResourceBundle = {
  [key: MessageKeyType]: string;
};

export class Messages {
  private readonly mapping: Record<MessageKeyType, CompiledMessage>;

  constructor(messages: ResourceBundle, locale: string) {
    const entries = Object.entries(messages);
    if (entries.length === 0) {
      this.mapping = {};
    } else {
      this.mapping = Object.fromEntries(
        entries.map(([key, value]) => [key, MessageFormat(value, locale)]),
      );
    }
  }

  private get(key: MessageKeyType): CompiledMessage {
    const message = this.mapping[key];
    if (message != null) {
      return message;
    }
    if (process.env.NODE_ENV !== "test") {
      console.debug(`Translation for ${key} not found, using fallback`);
    }
    return {
      format: (args?: MessageContext): string =>
        args === undefined ? "" : Object.values(args).join(" "),
    };
  }

  format(
    key: MessageKeyType,
    args: MessageContext | undefined = undefined,
  ): string {
    const message = this.get(key);
    return message.format(args);
  }
}

export enum ResourceBundleName {
  messages = "io.jenkins.plugins.pipelinegraphview.Messages",
}

export async function getMessages(
  locale: string,
  bundleNames: ResourceBundleName[],
): Promise<Messages> {
  const bundles = await Promise.all(
    bundleNames.map((name) => getResourceBundle(name).then((r) => r ?? {})),
  );

  const messages = bundles.reduce(
    (acc, bundle) => ({ ...acc, ...bundle }),
    DEFAULT_MESSAGES,
  );

  return new Messages(messages, locale);
}

export type MessageKeyType = LocalizedMessageKey | string;

export enum LocalizedMessageKey {
  startedAgo = "startedAgo",
  queued = "queued",
  noBuilds = "noBuilds",
  start = "node.start",
  end = "node.end",
  changesSummary = "changes.summary",
  settings = "settings",
  showNames = "settings.showStageName",
  showDuration = "settings.showStageDuration",
  showStages = "stages.show",
  hideStages = "stages.hide",
  consoleNewTab = "console.newTab",
  consoleCopy = "console.copy",
  consoleCopied = "console.copied",
  consoleCopyFailed = "console.copyFailed",
  tailLogsResume = "tailLogs.resume",
  tailLogsPause = "tailLogs.pause",
  expandNestedStages = "collapse.expandNested",
  collapseNestedStages = "collapse.collapseNested",
  expandAllStages = "collapse.expandAll",
  collapseAllStages = "collapse.collapseAll",
  consoleSectionLines = "console.section.lines",
  consoleSectionUntitled = "console.section.untitled",
  inputAlreadySubmitted = "input.alreadySubmitted",
  inputSubmitFailed = "input.submitFailed",
  inputFormFailed = "input.formFailed",
  inputApprovers = "input.approvers",
  stageDurationsStage = "stageDurations.stage",
  stageDurationsTotal = "stageDurations.total",
  stageDurationsMedian = "stageDurations.median",
  stageDurationsTrend = "stageDurations.trend",
  stageDurationsNotRun = "stageDurations.notRun",
  stageDurationsComparedWith = "stageDurations.comparedWith",
  stageDurationsBuilds = "stageDurations.builds",
  stageDurationsLegendSlower = "stageDurations.legend.slower",
  stageDurationsLegendMuchSlower = "stageDurations.legend.muchSlower",
  stageDurationsLegendFaster = "stageDurations.legend.faster",
  stageDurationsGotSlower = "stageDurations.gotSlower",
  stageDurationsGotFaster = "stageDurations.gotFaster",
  stageDurationsSince = "stageDurations.since",
  stageDurationsRecent = "stageDurations.recent",
  stageDurationsNoChanges = "stageDurations.noChanges",
  stageDurationsNeedMoreBuilds = "stageDurations.needMoreBuilds",
  stageDurationsChanges = "stageDurations.changes",
}

const DEFAULT_MESSAGES: ResourceBundle = {
  [LocalizedMessageKey.startedAgo]: "Started {0} ago",
  [LocalizedMessageKey.queued]: "Queued {0}",
  [LocalizedMessageKey.noBuilds]: "No builds",
  [LocalizedMessageKey.start]: "Start",
  [LocalizedMessageKey.end]: "End",
  [LocalizedMessageKey.changesSummary]: "{0} {0,choice,1#change|1<changes}",
  [LocalizedMessageKey.settings]: "Settings",
  [LocalizedMessageKey.showNames]: "Show stage names",
  [LocalizedMessageKey.showDuration]: "Show stage duration",
  [LocalizedMessageKey.showStages]: "Show stages",
  [LocalizedMessageKey.hideStages]: "Hide stages",
  [LocalizedMessageKey.consoleNewTab]: "View step as plain text",
  [LocalizedMessageKey.consoleCopy]: "Copy step output",
  [LocalizedMessageKey.consoleCopied]: "Copied step output to the clipboard",
  [LocalizedMessageKey.consoleCopyFailed]: "Could not copy step output",
  [LocalizedMessageKey.tailLogsResume]: "Resume tailing logs",
  [LocalizedMessageKey.tailLogsPause]: "Pause tailing logs",
  [LocalizedMessageKey.expandNestedStages]: "Expand nested stages",
  [LocalizedMessageKey.collapseNestedStages]: "Collapse nested stages",
  [LocalizedMessageKey.expandAllStages]: "Expand all stages",
  [LocalizedMessageKey.collapseAllStages]: "Collapse all stages",
  [LocalizedMessageKey.consoleSectionLines]:
    "{0} {0,choice,0#lines|1#line|1<lines}",
  [LocalizedMessageKey.consoleSectionUntitled]: "Section",
  [LocalizedMessageKey.inputAlreadySubmitted]:
    "This input has already been submitted",
  [LocalizedMessageKey.inputSubmitFailed]: "Submitting the input failed: {0}",
  [LocalizedMessageKey.inputFormFailed]: "Loading the input form failed: {0}",
  [LocalizedMessageKey.inputApprovers]: "Waiting for approval from {0}",
  [LocalizedMessageKey.stageDurationsStage]: "Stage",
  [LocalizedMessageKey.stageDurationsTotal]: "Total",
  [LocalizedMessageKey.stageDurationsMedian]: "Median",
  [LocalizedMessageKey.stageDurationsTrend]: "Trend",
  [LocalizedMessageKey.stageDurationsNotRun]: "Not run in this build",
  [LocalizedMessageKey.stageDurationsComparedWith]: "{0}, usually {1} ({2})",
  [LocalizedMessageKey.stageDurationsBuilds]:
    "Last {0} {0,choice,1#build|1<builds}, oldest to newest",
  [LocalizedMessageKey.stageDurationsLegendSlower]: "Slower than usual",
  [LocalizedMessageKey.stageDurationsLegendMuchSlower]: "Twice as long or more",
  [LocalizedMessageKey.stageDurationsLegendFaster]: "Faster than usual",
  [LocalizedMessageKey.stageDurationsGotSlower]:
    "{0} {0,choice,1#stage|1<stages} got slower",
  [LocalizedMessageKey.stageDurationsGotFaster]:
    "{0} {0,choice,1#stage|1<stages} got faster",
  [LocalizedMessageKey.stageDurationsSince]: "since {0}",
  [LocalizedMessageKey.stageDurationsRecent]:
    "Only in the last {0} {0,choice,1#build|1<builds} so far",
  [LocalizedMessageKey.stageDurationsNoChanges]:
    "No stage has got noticeably slower or faster in these builds",
  [LocalizedMessageKey.stageDurationsNeedMoreBuilds]:
    "Slower stages are pointed out once there are at least {0} builds to compare",
  [LocalizedMessageKey.stageDurationsChanges]: "Changes",
};

export function defaultMessages(locale: string): Messages {
  return new Messages(DEFAULT_MESSAGES, locale);
}
