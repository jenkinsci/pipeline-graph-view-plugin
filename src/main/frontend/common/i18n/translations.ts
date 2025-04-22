import MessageFormat, { MessageFunction } from "@messageformat/core";
import { getResourceBundle } from "../RestClient";
import { choice } from "./choice-formatter";

// plural name?
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

// get the locale somehow
export async function getTranslations(
  locale: string = "en",
): Promise<Translations> {
  const messages = await getResourceBundle("hudson.Messages");

  const format = new MessageFormat(locale, {
    customFormatters: {
      choice: {
        arg: "raw",
        formatter: choice,
      },
    },
  });

  const mapping: Message = Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      format.compile(value),
    ]),
  );

  return new Translations(mapping);
}
