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
  millisecond = "timings.millisecond",
  second = "timings.second",
  minute = "timings.minute",
  hour = "timings.hour",
  day = "timings.day",
  month = "timings.month",
  year = "timings.year",
  startedAgo = "startedAgo",
  noBuilds = "noBuilds",
  start = "node.start",
  end = "node.end",
}

const DEFAULT_MESSAGES: ResourceBundle = {
  [LocalizedMessageKey.millisecond]: "{0} ms",
  [LocalizedMessageKey.second]: "{0} sec",
  [LocalizedMessageKey.minute]: "{0} min",
  [LocalizedMessageKey.hour]: "{0} hr",
  [LocalizedMessageKey.day]: "{0} {0,choice,0#days|1#day|1<days}",
  [LocalizedMessageKey.month]: "{0} mo",
  [LocalizedMessageKey.year]: "{0} yr",
  [LocalizedMessageKey.startedAgo]: "Started {0} ago",
  [LocalizedMessageKey.noBuilds]: "No builds",
  [LocalizedMessageKey.start]: "Start",
  [LocalizedMessageKey.end]: "End",
};

export function defaultMessages(locale: string): Messages {
  return new Messages(DEFAULT_MESSAGES, locale);
}
