export interface Result {
  isSelectGraphicRendition?: boolean;
  escapeCode?: string; // input
  setFG?: number | false; // 0-7 if a foreground color is specified
  setBG?: number | false; // 0-7 if a background color is specified
  resetFG?: boolean; // true if contains a reset back to default foreground
  resetBG?: boolean; // true if contains a reset back to default background
  setBold?: boolean; // true if contains a bold font style
  setFaint?: boolean; // true if contains a faint font style
  setItalic?: boolean; // true if contains an italic font style
  setUnderline?: boolean; // true if contains an underline font style
  setStrikeThrough?: boolean; // true if contains a strike-through font style
}

/**
 * Parse an isolated escape code, looking for "SelectGraphicsRendition" codes specifically.
 *
 * Result:
 * ```
 * // Supported code
 * {
 *     isSelectGraphicRendition: true,
 *     escapeCode: string, // input
 *     setFG: integer | false, // 0-7 if a foreground color is specified
 *     setBG: integer | false, // 0-7 if a background color is specified
 *     resetFG: bool, // true if contains a reset back to default foreground
 *     resetBG: bool // true if contains a reset back to default background
 *     setBold: boolean, // true if contains a bold font style
 *     setFaint: boolean; // true if contains a faint font style
 *     setItalic: boolean; // true if contains an italic font style
 *     setUnderline: boolean, // true if contains an underline font style
 *     setStrikeThrough: boolean, // true if contains a strike-through font style
 * }
 *
 * // Unsupported or malformed code:
 * {
 *     isSelectGraphicRendition: false,
 *     escapeCode: string // input
 * }
 * ```
 */
export function parseEscapeCode(escapeCode: string): Result {
  // eslint-disable-next-line no-control-regex
  const graphicsPattern = /^\u001b\[([;0-9]*)m$/; // We only care about SGR codes

  const result: Result = {
    isSelectGraphicRendition: false, // True when is a color / font command
    escapeCode,
  };

  const match = graphicsPattern.exec(escapeCode);

  if (match) {
    result.isSelectGraphicRendition = true;
    result.setFG = false;
    result.setBG = false;
    result.resetFG = false;
    result.resetBG = false;

    // Convert param string to array<int> with length > 1
    const params = (match[1] || "")
      .split(";")
      .map((str) => parseInt(str || "0"));

    // Now go through the ints, decode them into bg/fg info
    for (let i = 0; i < params.length; i++) {
      const num = params[i];
      if (num === 38 || num === 48 || num === 58) {
        // 256-colour (5;n) and truecolour (2;r;g;b) have no matching style; skip their arguments
        const mode = params[i + 1];
        i += mode === 5 ? 2 : mode === 2 ? 4 : 0;
      } else if (num >= 30 && num <= 37) {
        result.setFG = num - 30; // Normal FG set
      } else if (num >= 40 && num <= 47) {
        result.setBG = num - 40; // Normal BG set
      } else if (num >= 90 && num <= 97) {
        result.setFG = num - 90 + 8; // Bright FG set
      } else if (num >= 100 && num <= 107) {
        result.setBG = num - 100 + 8; // Bright BG set
      } else if (num === 1) {
        result.setBold = true;
      } else if (num === 2) {
        result.setFaint = true;
      } else if (num === 22) {
        result.setBold = false;
        result.setFaint = false;
      } else if (num === 3) {
        result.setItalic = true;
      } else if (num === 23) {
        result.setItalic = false;
      } else if (num === 4) {
        result.setUnderline = true;
      } else if (num === 24) {
        result.setUnderline = false;
      } else if (num === 9) {
        result.setStrikeThrough = true;
      } else if (num === 29) {
        result.setStrikeThrough = false;
      } else {
        if (num === 39 || num === 0) {
          result.resetFG = true;
          result.setFG = false;
        }

        if (num === 49 || num === 0) {
          result.resetBG = true;
          result.setBG = false;
        }

        // ANSI code 0 should reset all formatting attributes
        if (num === 0) {
          result.setBold = false;
          result.setFaint = false;
          result.setItalic = false;
          result.setUnderline = false;
          result.setStrikeThrough = false;
        }
      }
    }
  }

  return result;
}

// CSI (ESC [ params final), OSC (ESC ] text BEL|ST) and other ESC sequences
// (ESC intermediates final). A CSI cut off at the end of the input is still consumed.
const ESCAPE_SEQUENCE_SOURCE = String.raw`\u001b(?:\[[0-?]*[ -/]*[@-~]?|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|[ -/]*[0-~])?`;
const ESCAPE_SEQUENCE = new RegExp(ESCAPE_SEQUENCE_SOURCE, "y");
const ESCAPE_SEQUENCES = new RegExp(ESCAPE_SEQUENCE_SOURCE, "g");
// A comment or tag; a ">" inside a quoted attribute value does not end the tag.
const TAG = /<!--[\s\S]*?(?:-->|$)|<(?:"[^"]*"|'[^']*'|[^'">])*(?:>|$)/y;
// eslint-disable-next-line no-control-regex
const TEXT = /[^\u001b<]+/y;

type TextStyle = Required<
  Pick<
    Result,
    | "setFG"
    | "setBG"
    | "setBold"
    | "setFaint"
    | "setItalic"
    | "setUnderline"
    | "setStrikeThrough"
  >
>;

const DEFAULT_STYLE: TextStyle = {
  setFG: false,
  setBG: false,
  setBold: false,
  setFaint: false,
  setItalic: false,
  setUnderline: false,
  setStrikeThrough: false,
};

function applyEscapeCode(style: TextStyle, code: Result): TextStyle {
  const next = { ...style };
  if (code.resetFG) next.setFG = false;
  if (code.resetBG) next.setBG = false;
  if (typeof code.setFG === "number") next.setFG = code.setFG;
  if (typeof code.setBG === "number") next.setBG = code.setBG;
  if (code.setBold !== undefined) next.setBold = code.setBold;
  if (code.setFaint !== undefined) next.setFaint = code.setFaint;
  if (code.setItalic !== undefined) next.setItalic = code.setItalic;
  if (code.setUnderline !== undefined) next.setUnderline = code.setUnderline;
  if (code.setStrikeThrough !== undefined) {
    next.setStrikeThrough = code.setStrikeThrough;
  }
  return next;
}

function classNamesFor(style: TextStyle): string[] {
  const classNames = [];
  if (typeof style.setFG === "number") {
    classNames.push(`ansi-fg-${style.setFG}`);
  }
  if (typeof style.setBG === "number") {
    classNames.push(`ansi-bg-${style.setBG}`);
  }
  if (style.setBold) classNames.push("ansi-bold");
  if (style.setFaint) classNames.push("ansi-faint");
  if (style.setItalic) classNames.push("ansi-italic");
  if (style.setUnderline) classNames.push("ansi-underline");
  if (style.setStrikeThrough) classNames.push("ansi-strikethrough");
  return classNames;
}

/**
 * Converts ANSI SGR escape codes in console HTML into `<span class="ansi-*">` elements.
 *
 * The input is HTML, as produced by Jenkins console annotators (timestamps, hyperlinks,
 * ...). Each run of text between tags gets its own span, so the generated spans never
 * cross the boundaries of the existing markup. Escape sequences inside a tag are dropped:
 * Jenkins' URL annotator can include a trailing escape sequence in an `href`.
 */
export function ansiToHtml(input: string): string {
  if (!input.includes("\u001b")) {
    return input;
  }

  let output = "";
  let style = DEFAULT_STYLE;
  let i = 0;

  const matchAt = (pattern: RegExp) => {
    pattern.lastIndex = i;
    return pattern.exec(input)?.[0];
  };

  while (i < input.length) {
    if (input[i] === "\u001b") {
      const sequence = matchAt(ESCAPE_SEQUENCE)!;
      const code = parseEscapeCode(sequence);
      if (code.isSelectGraphicRendition) {
        style = applyEscapeCode(style, code);
      }
      i += sequence.length;
    } else if (input[i] === "<") {
      const tag = matchAt(TAG) ?? input.substring(i);
      output += tag.replace(ESCAPE_SEQUENCES, "");
      i += tag.length;
    } else {
      const text = matchAt(TEXT)!;
      const classNames = classNamesFor(style);
      output += classNames.length
        ? `<span class="${classNames.join(" ")}">${text}</span>`
        : text;
      i += text.length;
    }
  }

  return output;
}
