import MessageFormat, { MessageFunction } from "@messageformat/core";
import { getResourceBundle } from "../RestClient.tsx";
import { choiceFormatter } from "./choice-formatter.ts";

export type ResourceBundle = {
  [key: string]: string;
};

export class Translations {
  private readonly mapping: Record<string, MessageFunction<"string">>;

  constructor(messages: ResourceBundle, locale: string) {
    const entries = Object.entries(messages);
    if (entries.length === 0) {
      this.mapping = {};
    } else {
      const fmt = messageFormat(locale);
      this.mapping = Object.fromEntries(
        entries.map(([key, value]) => [key, fmt.compile(value)]),
      );
    }
  }

  private get(key: string): MessageFunction<"string"> {
    const message = this.mapping[key];
    if (message != null) {
      return message;
    }
    if (process.env.NODE_ENV !== "test") {
      console.debug(`Translation for ${key} not found, using fallback`);
    }
    return (params) => {
      return params === undefined ? "" : Object.values(params as any).join(" ");
    };
  }

  format(key: string, args: Record<string, any> | null = null): string {
    const message = this.get(key);
    return args === null ? message() : message(args);
  }
}

function messageFormat(locale: string) {
  return new MessageFormat(locale, {
    customFormatters: {
      choice: choiceFormatter,
    },
  });
}

export enum ResourceBundleName {
  messages = "io.jenkins.plugins.pipelinegraphview.Messages",
}

export async function getTranslations(
  locale: string,
  bundleNames: ResourceBundleName[],
): Promise<Translations> {
  const bundles = await Promise.all(
    bundleNames.map((name) => getResourceBundle(name).then((r) => r ?? {})),
  );

  const messages = bundles.reduce(
    (acc, bundle) => ({ ...acc, ...bundle }),
    DEFAULT_MESSAGES,
  );

  return new Translations(messages, locale);
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
};

export function defaultTranslations(locale: string) {
  return new Translations(DEFAULT_MESSAGES, locale);
}
