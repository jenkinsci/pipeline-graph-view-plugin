/**
 * Flags console lines that look like errors or warnings so they can be
 * highlighted. Jenkins merges stdout and stderr into one log, so the only
 * signal is the text itself. Patterns are kept strict (anchored prefixes and
 * well-known tool output) so lines such as "Errors: 0" are left alone.
 */

import { TIMESTAMP_PREFIX_RE } from "./parseConsoleSections.ts";

export type LineSeverity = "error" | "warning";

// eslint-disable-next-line no-control-regex
const TAG_OR_ANSI_RE = /<[^>]*>|\x1b\[[0-9;]*[a-zA-Z]/g;

const ERROR_PATTERNS: RegExp[] = [
  // Maven, Gradle and most loggers: "[ERROR] …", "ERROR: …", "FATAL: …"
  /^\[(?:ERROR|FATAL|SEVERE)\]/,
  /^(?:ERROR|FATAL|SEVERE|error|fatal)(?::|\s-\s)/,
  // Compilers: "src/a.c:12:5: error: …", "src/a.ts(1,2): error TS2304: …"
  /^\S+?:\d+(?::\d+)?:\s+(?:fatal\s+)?error\b/,
  /^\S+?\(\d+,\d+\):\s+error\b/,
  // Exceptions: "java.lang.IllegalStateException: …", "TypeError: …"
  /^(?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*(?:Error|Exception)(?::\s|$)/,
  /^Exception in thread\b/,
  /^Traceback \(most recent call last\):/,
  /^(?:Caused by|Caused|Also):\s/, // "Caused:" is Jenkins' own format
  // Package managers
  /^npm (?:ERR!|error)\s/,
  /^yarn error\b/i,
  // Test runners and build results
  /<<< (?:FAILURE|ERROR)!/,
  /^(?:BUILD FAILED|FAILURE:|FAIL\s|FAILED\s|--- FAIL:|panic:)/,
  /\bBUILD FAILURE\b/,
  /^Finished: FAILURE$/,
];

const WARNING_PATTERNS: RegExp[] = [
  /^\[(?:WARN|WARNING)\]/,
  /^(?:WARN|WARNING|Warning|warning)(?::|\s-\s)/,
  /^\S+?:\d+(?::\d+)?:\s+warning\b/,
  /^\S+?\(\d+,\d+\):\s+warning\b/,
  /^npm (?:WARN|warn)\s/,
];

// Lines that continue an error printed just above them.
const STACK_FRAME_PATTERNS: RegExp[] = [
  /^\s+at\s/, // Java, JavaScript
  /^\s*\.\.\. \d+ (?:more|common frames omitted)/, // Java
  /^\s+(?:Caused by|Caused|Suppressed):\s/, // Java (nested)
  /^\s+File "/, // Python
];

/** Visible text of a console line, without markup or a Timestamper prefix. */
export function visibleText(raw: string): string {
  let text = raw.replace(TAG_OR_ANSI_RE, "");
  if (text.includes("&")) {
    text = text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }
  return text.replace(TIMESTAMP_PREFIX_RE, "").trimEnd();
}

/**
 * Classifies lines one at a time, in log order. It remembers whether the
 * previous line was part of an error so stack frames below it are included.
 */
export class LineClassifier {
  private inError = false;
  private inPythonTraceback = false;

  classify(raw: string): LineSeverity | undefined {
    const text = visibleText(raw);
    const severity = this.classifyText(text);
    this.inError = severity === "error";
    return severity;
  }

  /** Forgets any error in progress, e.g. at a section boundary. */
  reset() {
    this.inError = false;
    this.inPythonTraceback = false;
  }

  clone(): LineClassifier {
    const copy = new LineClassifier();
    copy.inError = this.inError;
    copy.inPythonTraceback = this.inPythonTraceback;
    return copy;
  }

  private classifyText(text: string): LineSeverity | undefined {
    if (this.inError && text.trim() !== "") {
      if (STACK_FRAME_PATTERNS.some((re) => re.test(text))) return "error";
      // Python prints the failing source line indented below each frame.
      if (this.inPythonTraceback && /^\s/.test(text)) return "error";
    }

    if (/^Traceback \(most recent call last\):/.test(text)) {
      this.inPythonTraceback = true;
      return "error";
    }
    this.inPythonTraceback &&= this.inError && /^\s/.test(text);

    const trimmed = text.trimStart();
    if (ERROR_PATTERNS.some((re) => re.test(trimmed))) return "error";
    if (WARNING_PATTERNS.some((re) => re.test(trimmed))) return "warning";
    return undefined;
  }
}

/** Classifies a complete set of lines in one go. */
export function classifyConsoleLines(
  lines: string[],
): (LineSeverity | undefined)[] {
  const classifier = new LineClassifier();
  return lines.map((line) => classifier.classify(line));
}
