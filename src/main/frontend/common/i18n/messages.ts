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
  consoleNewTab = "console.newTab",
  tailLogsResume = "tailLogs.resume",
  tailLogsPause = "tailLogs.pause",
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
  [LocalizedMessageKey.consoleNewTab]: "View step as plain text",
  [LocalizedMessageKey.tailLogsResume]: "Resume tailing logs",
  [LocalizedMessageKey.tailLogsPause]: "Pause tailing logs",
};

export function defaultMessages(locale: string): Messages {
  return new Messages(DEFAULT_MESSAGES, locale);
}
