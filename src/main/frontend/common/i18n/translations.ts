import MessageFormat, { MessageFunction } from "@messageformat/core";
import { getResourceBundle } from "../RestClient";
import { choiceFormatter } from "./choice-formatter";

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
    console.debug(`Translation for ${key} not found, using fallback`);
    return (params) => Object.values(params as any).join(" ");
  }
}

export function messageFormat(locale: string) {
  return new MessageFormat(locale, {
    customFormatters: {
      choice: choiceFormatter,
    },
  });
}

export async function getTranslations(locale: string): Promise<Translations> {
  const messages = await getResourceBundle("hudson.Messages");

  const fmt = messageFormat(locale);

  const mapping: Message = Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, fmt.compile(value)]),
  );

  return new Translations(mapping);
}
