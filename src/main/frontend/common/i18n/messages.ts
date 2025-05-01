import { getResourceBundle } from "../RestClient.tsx";
import {
  CompiledMessage,
  MessageContext,
  MessageFormat,
} from "./message-format.ts";

export type ResourceBundle = {
  [key: string]: string;
};

export class Messages {
  private readonly mapping: Record<string, CompiledMessage>;

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

  private get(key: string): CompiledMessage {
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

  format(key: string, args: MessageContext | undefined = undefined): string {
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

const DEFAULT_MESSAGES: ResourceBundle = {
  "Util.millisecond": "{0} ms",
  "Util.second": "{0} sec",
  "Util.minute": "{0} min",
  "Util.hour": "{0} hr",
  "Util.day": "{0} {0,choice,0#days|1#day|1<days}",
  "Util.month": "{0} mo",
  "Util.year": "{0} yr",
  startedAgo: "Started {0} ago",
  noBuilds: "No builds",
  start: "Start",
  end: "End"
};

export function defaultMessages(locale: string): Messages {
  return new Messages(DEFAULT_MESSAGES, locale);
}
