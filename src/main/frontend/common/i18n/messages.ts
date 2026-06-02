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
  showBuildFlow = "settings.showBuildFlow",
  consoleNewTab = "console.newTab",
  tailLogsResume = "tailLogs.resume",
  tailLogsPause = "tailLogs.pause",
  buildFlowTitle = "buildFlow.title",
  buildFlowLoading = "buildFlow.loading",
  buildFlowError = "buildFlow.error",
  buildFlowEmpty = "buildFlow.empty",
  buildFlowTruncated = "buildFlow.truncated",
  buildFlowZoomIn = "buildFlow.zoomIn",
  buildFlowZoomOut = "buildFlow.zoomOut",
  buildFlowFitToView = "buildFlow.fitToView",
  buildFlowShowUpstream = "buildFlow.showUpstream",
  buildFlowHideUpstream = "buildFlow.hideUpstream",
  buildFlowShowDownstream = "buildFlow.showDownstream",
  buildFlowHideDownstream = "buildFlow.hideDownstream",
  buildFlowFocusFlow = "buildFlow.focusFlow",
  buildFlowShowFullGraph = "buildFlow.showFullGraph",
  buildFlowShowHistory = "buildFlow.showHistory",
  buildFlowHideHistory = "buildFlow.hideHistory",
  buildFlowEnableAutoRefresh = "buildFlow.enableAutoRefresh",
  buildFlowDisableAutoRefresh = "buildFlow.disableAutoRefresh",
  buildFlowShowDuration = "buildFlow.showDuration",
  buildFlowShowBuildNumber = "buildFlow.showBuildNumber",
  buildFlowShowFullNames = "buildFlow.showFullNames",
  buildFlowShowDescription = "buildFlow.showDescription",
  buildFlowTopToBottom = "buildFlow.topToBottom",
  buildFlowLeftToRight = "buildFlow.leftToRight",
  buildFlowShowGraph = "buildFlow.showGraph",
  buildFlowFlattenToGrid = "buildFlow.flattenToGrid",
  buildFlowMoreOptions = "buildFlow.moreOptions",
  buildFlowDisplayOptions = "buildFlow.displayOptions",
  buildFlowClose = "buildFlow.close",
  buildFlowExpand = "buildFlow.expand",
  buildFlowGraphLabel = "buildFlow.graphLabel",
  expandNestedStages = "collapse.expandNested",
  collapseNestedStages = "collapse.collapseNested",
  expandAllStages = "collapse.expandAll",
  collapseAllStages = "collapse.collapseAll",
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
  [LocalizedMessageKey.showBuildFlow]: "Show Build Flow",
  [LocalizedMessageKey.consoleNewTab]: "View step as plain text",
  [LocalizedMessageKey.tailLogsResume]: "Resume tailing logs",
  [LocalizedMessageKey.tailLogsPause]: "Pause tailing logs",
  [LocalizedMessageKey.buildFlowTitle]: "Build Flow",
  [LocalizedMessageKey.buildFlowLoading]: "Loading build flow\u2026",
  [LocalizedMessageKey.buildFlowError]: "Failed to load build flow: {0}",
  [LocalizedMessageKey.buildFlowEmpty]:
    "No upstream or downstream builds found.",
  [LocalizedMessageKey.buildFlowTruncated]:
    "Graph truncated at {0} nodes. Some builds may not be shown.",
  [LocalizedMessageKey.buildFlowZoomIn]: "Zoom in",
  [LocalizedMessageKey.buildFlowZoomOut]: "Zoom out",
  [LocalizedMessageKey.buildFlowFitToView]: "Fit to view",
  [LocalizedMessageKey.buildFlowShowUpstream]: "Show upstream",
  [LocalizedMessageKey.buildFlowHideUpstream]: "Hide upstream",
  [LocalizedMessageKey.buildFlowShowDownstream]: "Show downstream",
  [LocalizedMessageKey.buildFlowHideDownstream]: "Hide downstream",
  [LocalizedMessageKey.buildFlowFocusFlow]: "Focus current build's flow",
  [LocalizedMessageKey.buildFlowShowFullGraph]: "Show full graph",
  [LocalizedMessageKey.buildFlowShowHistory]: "Show build history",
  [LocalizedMessageKey.buildFlowHideHistory]: "Hide build history",
  [LocalizedMessageKey.buildFlowEnableAutoRefresh]: "Enable auto-refresh",
  [LocalizedMessageKey.buildFlowDisableAutoRefresh]: "Disable auto-refresh",
  [LocalizedMessageKey.buildFlowShowDuration]: "Show duration",
  [LocalizedMessageKey.buildFlowShowBuildNumber]: "Show build number",
  [LocalizedMessageKey.buildFlowShowFullNames]: "Show full names",
  [LocalizedMessageKey.buildFlowShowDescription]: "Show description",
  [LocalizedMessageKey.buildFlowTopToBottom]: "Top-to-bottom",
  [LocalizedMessageKey.buildFlowLeftToRight]: "Left-to-right",
  [LocalizedMessageKey.buildFlowShowGraph]: "Show graph",
  [LocalizedMessageKey.buildFlowFlattenToGrid]: "Flatten to grid",
  [LocalizedMessageKey.buildFlowMoreOptions]: "More options",
  [LocalizedMessageKey.buildFlowDisplayOptions]: "Build flow display options",
  [LocalizedMessageKey.buildFlowClose]: "Close",
  [LocalizedMessageKey.buildFlowExpand]: "Expand",
  [LocalizedMessageKey.buildFlowGraphLabel]: "Build flow graph with {0} builds",
  [LocalizedMessageKey.expandNestedStages]: "Expand nested stages",
  [LocalizedMessageKey.collapseNestedStages]: "Collapse nested stages",
  [LocalizedMessageKey.expandAllStages]: "Expand all stages",
  [LocalizedMessageKey.collapseAllStages]: "Collapse all stages",
};

export function defaultMessages(locale: string): Messages {
  return new Messages(DEFAULT_MESSAGES, locale);
}
