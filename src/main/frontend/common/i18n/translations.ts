import MessageFormat, { MessageFunction } from "@messageformat/core";
import { getResourceBundle } from "../RestClient";
import { choiceFormatter } from "./choice-formatter";

export interface ResourceBundle {
  [key: string]: string;
}

interface Message {
  [key: string]: MessageFunction<"string">;
}

export class Translations {
  private readonly mapping: Message;

  constructor(mapping: Message) {
    this.mapping = mapping;
  }

  get(key: string): MessageFunction<"string"> {
    const message = this.mapping[key];
    if (message != null) {
      return message;
    }
    if (!process.env.JEST_WORKER_ID) {
      console.debug(`Translation for ${key} not found, using fallback`);
    }
    return (params) => {
      return params == undefined ? "" : Object.values(params as any).join(" ");
    };
  }
}

export function messageFormat(locale: string) {
  return new MessageFormat(locale, {
    customFormatters: {
      choice: choiceFormatter,
    },
  });
}

export enum ResourceBundleName {
  messages = "hudson.Messages",
  run = "hudson.model.Run.index",
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

  const fmt = messageFormat(locale);

  const mapping: Message = Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, fmt.compile(value)]),
  );

  return new Translations(mapping);
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
};

export function defaultTranslations(locale: string) {
  const fmt = messageFormat(locale);

  return new Translations(
    Object.fromEntries(
      Object.entries(DEFAULT_MESSAGES).map(([key, value]) => [
        key,
        fmt.compile(value),
      ]),
    ),
  );
}
