// This is a very basic replication of MessageFormat in Java,
// it only covers the use cases that we currently have and nothing more so it
// may need to be extended in the future.
// It expects the pattern coming in to be well-formed and as such contains very
// little error checking in regard to the format.
// A library alternative to using this is @messageformat/core, but we are not
// using that as we do not need all the functionality it brings for the size
// of the library. (see https://github.com/jenkinsci/pipeline-graph-view-plugin/issues/679)
// Previous commits should show how we used it before in the event that we need
// to return to that approach in the future.
function compile(pattern: string): MessageChunk[] {
  const chunks: MessageChunk[] = [];
  let buffer = "";
  let currentIndex: string | null = null;
  let currentType: string | null = null;
  let segment: "raw" | "type" | "modifier" | "index" = "raw";

  for (let i = 0; i < pattern.length; ++i) {
    const char = pattern[i];
    if (segment === "raw") {
      if (char === "{") {
        // we are now starting a formattable section
        segment = "index";
        if (buffer) {
          chunks.push(new TextChunk(buffer));
          buffer = "";
        }
      } else {
        buffer += char;
      }
    } else if (segment === "index") {
      if (char === ",") {
        currentIndex = buffer.trim();
        buffer = "";
        segment = "type";
      } else if (char === "}") {
        currentIndex = buffer.trim();
        buffer = "";
        chunks.push(new VariableChunk(currentIndex));
        segment = "raw";
      } else {
        buffer += char;
      }
    } else if (segment === "type") {
      if (char === ",") {
        currentType = buffer.trim();
        segment = "modifier";
        buffer = "";
      } else {
        buffer += char;
      }
    } else if (segment === "modifier") {
      if (char === "}") {
        const modifier = buffer.trim();
        buffer = "";

        if (currentType === "choice") {
          chunks.push(new ChoiceChunk(currentIndex!, modifier));
        } else {
          throw new Error(
            `Unsupported format type ${currentType} in ${pattern}`,
          );
        }
        segment = "raw";
        currentType = null;
      } else {
        buffer += char;
      }
    }
  }

  // Add remaining buffer as a PlainChunk
  if (buffer) {
    chunks.push(new TextChunk(buffer));
  }

  return chunks;
}

export type ContextValue = string | number;
export type MessageContext = Record<string, ContextValue>;

abstract class MessageChunk {
  abstract render(context: MessageContext, locale: string): string;
}

class TextChunk extends MessageChunk {
  constructor(private readonly text: string) {
    super();
  }

  render(): string {
    return this.text;
  }
}

class VariableChunk extends MessageChunk {
  constructor(protected readonly argIndex: string) {
    super();
  }

  render(context: MessageContext, locale: string): string {
    const value = context[this.argIndex];
    if (value == null) {
      return `{${this.argIndex}}`;
    }
    switch (typeof value) {
      case "number":
        return new Intl.NumberFormat(locale, {
          style: "decimal",
        }).format(value);
      default:
        return value;
    }
  }
}

type Choice = {
  value: string;
  limit: number;
};

class ChoiceChunk extends VariableChunk {
  private readonly choices: Choice[];

  constructor(argIndex: string, modifier: string) {
    super(argIndex);
    this.choices = this.determineChoices(modifier);
  }

  private nextUp(current: number): number {
    if (isNaN(current) || current === Number.POSITIVE_INFINITY) {
      return current;
    }
    if (current === 0) {
      return Number.MIN_VALUE;
    }
    const next = current + Number.EPSILON;
    // The final multiplication (current * (1 + Number.EPSILON)) is needed to handle cases where adding
    // Number.EPSILON to current does not result in a larger number due to floating-point precision limitations.
    // This ensures that the next representable floating-point number greater than current is returned,
    // even when current + Number.EPSILON equals current.
    return next === current ? current * (1 + Number.EPSILON) : next;
  }

  private determineChoices(arg: string): Choice[] {
    const parts = arg!.split("|");
    const choices: Choice[] = [];
    // a simple attempt to copy java.text.ChoiceFormat.applyPattern
    // we can assume that these are correctly parsed formats as otherwise java code would have complained
    // so a part is made up of a number and operator and a value
    // the valid operators are <, ≤, # (which means equal)
    for (const part of parts) {
      // let's iterate through the part until we reach an operator
      for (let i = 0; i < part.length; i++) {
        const char = part.charAt(i);
        if (char === "<" || char === "\u2264" || char === "#") {
          const operator = char;
          const number = parseFloat(part.substring(0, i));
          choices.push({
            value: part.substring(i + 1),
            limit: operator === "<" ? this.nextUp(number) : number,
          });
          break;
        }
      }
    }
    return choices;
  }

  private select(value: number): string {
    let i = 0;
    for (; i < this.choices.length; ++i) {
      if (!(value >= this.choices[i].limit)) {
        // same as number < choiceLimits, except catches NaN
        break;
      }
    }
    --i;
    if (i < 0) {
      i = 0;
    }
    return this.choices[i].value;
  }

  render(context: MessageContext, locale: string): string {
    const value = context[this.argIndex];
    if (typeof value !== "number") {
      throw new Error(
        `Argument ${this.argIndex} '${value}' needs to be a number`,
      );
    }
    return this.select(value);
  }
}

export interface CompiledMessage {
  format(args?: MessageContext): string;
}

export const MessageFormat = (
  pattern: string,
  locale: string,
): CompiledMessage => {
  const messageChunks = compile(pattern);
  return {
    format: (args?: MessageContext): string => {
      args ??= {};
      return messageChunks.map((chunk) => chunk.render(args, locale)).join("");
    },
  };
};
