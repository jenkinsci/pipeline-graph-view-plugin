/**
 * Groups console lines into collapsible sections delimited by
 * `##[group]Title` / `##[endgroup]` (Azure DevOps) or
 * `::group::Title` / `::endgroup::` (GitHub Actions) markers.
 *
 * Lines are the HTML produced by `progressiveHtml`, so markers may be wrapped
 * in AnsiColor `<span>`s, raw ANSI escapes or a Timestamper prefix.
 */

export interface ConsoleSectionLine {
  kind: "line";
  /** 0-based index into the log buffer's lines. */
  index: number;
  content: string;
}

export interface ConsoleSectionGroup {
  kind: "group";
  /** Title HTML (unsanitized), or "" when the marker had no title. */
  title: string;
  /** Index of the marker line that opened this group. */
  startIndex: number;
  /** Index of the marker line that closed this group, or -1 if still open. */
  endIndex: number;
  /** Number of log lines in this group, including nested groups. */
  lineCount: number;
  children: ConsoleSectionNode[];
}

export type ConsoleSectionNode = ConsoleSectionLine | ConsoleSectionGroup;

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;
const HTML_TAG_RE = /<[^>]*>/g;
// eslint-disable-next-line no-control-regex
const TAG_OR_ANSI_RE = /<[^>]*>|\x1b\[[0-9;]*[a-zA-Z]/g;

// Timestamper renders a visible clock time and a hidden ISO timestamp, which
// after tag stripping read as "01:08:06 [2026-05-29T19:38:06.669Z] ".
const TIMESTAMP_PREFIX_RE =
  /^(?:\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[A-Z]*[+-]?\d{0,4}\]\s+|(?:\d{4}[-/]\d{2}[-/]\d{2}\s+)?\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s+)+/;

const GROUP_START_RE = /^(?:##\[group\]|::group::)(.*)$/;
const GROUP_END_RE = /^(?:##\[endgroup\]|::endgroup::)$/;
const GROUP_MARKER_RE = /##\[group\]|::group::/;

type Marker = { type: "start"; title: string } | { type: "end" } | null;

export function detectMarker(raw: string): Marker {
  // Every marker contains "group"; skip the regex work for all other lines.
  if (!raw.includes("group")) return null;

  const stripped = raw
    .replace(ANSI_RE, "")
    .replace(HTML_TAG_RE, "")
    .trimStart()
    .replace(TIMESTAMP_PREFIX_RE, "")
    .trim();

  const start = GROUP_START_RE.exec(stripped);
  if (start) {
    return { type: "start", title: titleHtml(raw, start[1]) };
  }
  if (GROUP_END_RE.test(stripped)) {
    return { type: "end" };
  }
  return null;
}

/**
 * Detection guarantees that only markup and a Timestamper prefix precede the
 * marker. Keeping the markup (minus its text) preserves colours that were
 * opened before the marker, while dropping the timestamp text.
 */
function titleHtml(raw: string, visibleTitle: string): string {
  if (!visibleTitle.trim()) return "";
  const marker = GROUP_MARKER_RE.exec(raw);
  if (!marker) return visibleTitle.trim();
  const styling = raw.slice(0, marker.index).match(TAG_OR_ANSI_RE) ?? [];
  const rest = raw.slice(marker.index + marker[0].length).trimStart();
  return (styling.join("") + rest).trimEnd();
}

interface OpenGroup {
  title: string;
  startIndex: number;
  lineCount: number;
  /** Completed children only; the next open group (if any) is implicit. */
  children: ConsoleSectionNode[];
}

export interface SectionParseInput {
  lines: string[];
  /** Position of `lines[0]` in the log; a change means the buffer was re-based. */
  startByte: number;
  /** Lines before this index are complete and will not change. */
  stableCount: number;
  /**
   * Lines from `stableCount` up to here are log output that may still change
   * (a partial last line). Lines after it are trailing extras such as the
   * exception text, which are rendered outside any section.
   */
  logLineCount: number;
}

/**
 * Parses log lines incrementally: each call only examines lines that became
 * stable since the previous call. Closed groups and stable line nodes keep
 * their identity between calls so memoized renderers can skip them.
 */
export class ConsoleSectionParser {
  private root: ConsoleSectionNode[] = [];
  private stack: OpenGroup[] = [];
  private parsed = 0;
  private startByte = NaN;
  private firstLine: string | undefined;

  update({
    lines,
    startByte,
    stableCount,
    logLineCount,
  }: SectionParseInput): ConsoleSectionNode[] {
    if (
      startByte !== this.startByte ||
      stableCount < this.parsed ||
      (this.parsed > 0 && lines[0] !== this.firstLine)
    ) {
      this.reset(startByte);
    }
    this.firstLine = lines[0];

    for (; this.parsed < stableCount; this.parsed++) {
      this.consume(this.parsed, lines[this.parsed]);
    }

    return this.snapshot(lines, stableCount, logLineCount);
  }

  private reset(startByte: number) {
    this.root = [];
    this.stack = [];
    this.parsed = 0;
    this.startByte = startByte;
  }

  private consume(index: number, content: string) {
    const marker = detectMarker(content);
    if (marker?.type === "start") {
      this.stack.push({
        title: marker.title,
        startIndex: index,
        lineCount: 0,
        children: [],
      });
      return;
    }
    if (marker?.type === "end" && this.stack.length > 0) {
      const open = this.stack.pop()!;
      this.append({
        kind: "group",
        title: open.title,
        startIndex: open.startIndex,
        endIndex: index,
        lineCount: open.lineCount,
        children: open.children,
      });
      return;
    }
    this.append({ kind: "line", index, content });
  }

  private append(node: ConsoleSectionNode) {
    const parent = this.stack[this.stack.length - 1];
    if (!parent) {
      this.root.push(node);
      return;
    }
    parent.children.push(node);
    parent.lineCount += node.kind === "line" ? 1 : node.lineCount;
  }

  private snapshot(
    lines: string[],
    stableCount: number,
    logLineCount: number,
  ): ConsoleSectionNode[] {
    let tail: ConsoleSectionNode[] = lineNodes(
      lines,
      stableCount,
      logLineCount,
    );
    for (let depth = this.stack.length - 1; depth >= 0; depth--) {
      const open = this.stack[depth];
      const extra = tail.reduce(
        (sum, n) => sum + (n.kind === "line" ? 1 : n.lineCount),
        0,
      );
      tail = [
        {
          kind: "group",
          title: open.title,
          startIndex: open.startIndex,
          endIndex: -1,
          lineCount: open.lineCount + extra,
          children: [...open.children, ...tail],
        },
      ];
    }
    return [
      ...this.root,
      ...tail,
      ...lineNodes(lines, logLineCount, lines.length),
    ];
  }
}

function lineNodes(
  lines: string[],
  from: number,
  to: number,
): ConsoleSectionLine[] {
  const nodes: ConsoleSectionLine[] = [];
  for (let i = from; i < to; i++) {
    nodes.push({ kind: "line", index: i, content: lines[i] });
  }
  return nodes;
}

/** Parses a complete set of lines in one go. */
export function parseConsoleSections(lines: string[]): ConsoleSectionNode[] {
  return new ConsoleSectionParser().update({
    lines,
    startByte: 0,
    stableCount: lines.length,
    logLineCount: lines.length,
  });
}
