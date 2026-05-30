/**
 * Console section parser.
 *
 * Detects collapsible section markers in console output:
 * - Azure DevOps / GitHub Actions style: ##[group]Title / ##[endgroup]
 * - GitHub Actions style alias: ::group::Title / ::endgroup::
 *
 * Lines between markers are grouped into ConsoleSectionGroup nodes.
 * Unmatched lines remain flat ConsoleSectionLine nodes.
 * Nesting is supported (groups can contain groups).
 * Unclosed groups auto-close at end of input (endIndex = -1).
 */

export interface ConsoleSectionLine {
  kind: "line";
  /** Original 0-based index into the raw lines array. */
  index: number;
  content: string;
}

export interface ConsoleSectionGroup {
  kind: "group";
  title: string;
  /** Index of the marker line that opened this group. */
  startIndex: number;
  /** Index of the marker line that closed this group, or -1 if unclosed. */
  endIndex: number;
  children: ConsoleSectionNode[];
}

export type ConsoleSectionNode = ConsoleSectionLine | ConsoleSectionGroup;

// ANSI escape sequence pattern for stripping before marker detection.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

// HTML tag pattern for stripping before marker detection.
// progressiveHtml returns HTML; AnsiColor plugin wraps ANSI codes in <span> tags.
const HTML_TAG_RE = /<[^>]*>/g;

// Timestamp prefix pattern for the Timestamper plugin.
// After HTML tags are stripped, timestamps remain as plain text. The plugin
// emits BOTH a visible clock time AND a hidden ISO timestamp per line:
//   "<b>01:08:06</b> <span style="display:none">[2026-05-29T19:38:06.669Z]</span> "
// After HTML stripping: "01:08:06 [2026-05-29T19:38:06.669Z] "
// The trailing + allows matching multiple consecutive timestamp prefixes.
const TIMESTAMP_PREFIX_RE =
  /^(?:\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[A-Z]*[+-]?\d{0,4}\]\s+|(?:\d{4}[-/]\d{2}[-/]\d{2}\s+)?\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s+)+/;

// Start markers: ##[group]Title or ::group::Title
const GROUP_START_RE = /^(?:##\[group\]|::group::)\s*(.*)$/;

// End markers: ##[endgroup] or ::endgroup::
const GROUP_END_RE = /^(?:##\[endgroup\]|::endgroup::)\s*$/;

/**
 * Strip ANSI escape codes, HTML tags, and leading whitespace from a line
 * for marker detection purposes. The original content is preserved
 * in the output nodes.
 */
function stripForDetection(line: string): string {
  return line
    .replace(ANSI_RE, "")
    .replace(HTML_TAG_RE, "")
    .replace(TIMESTAMP_PREFIX_RE, "")
    .trimStart();
}

// Pattern matching the group-start marker itself (no capture).
// Used to strip the marker from the raw line while preserving surrounding
// HTML tags and ANSI codes for colored title rendering.
const GROUP_MARKER_RE = /##\[group\]|::group::/;

/**
 * Parse raw console lines into a tree of sections.
 *
 * Detects ##[group]/##[endgroup] and ::group::/::endgroup:: markers.
 * Lines between markers are grouped; all other lines remain flat.
 * Supports nesting. Unclosed groups get endIndex = -1.
 */
export function parseConsoleSections(lines: string[]): ConsoleSectionNode[] {
  const root: ConsoleSectionNode[] = [];
  const stack: ConsoleSectionGroup[] = [];
  const target = () => stack.at(-1)?.children ?? root;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = stripForDetection(raw);

    // Reject shell trace lines (e.g. "+ echo ##[group]Build").
    if (stripped.startsWith("+ ")) {
      target().push({ kind: "line", index: i, content: raw });
      continue;
    }

    const startMatch = GROUP_START_RE.exec(stripped);
    if (startMatch) {
      // Preserve surrounding HTML/ANSI for colored title rendering.
      const title = raw.replace(GROUP_MARKER_RE, "").trim() || "Section";
      const group: ConsoleSectionGroup = {
        kind: "group",
        title,
        startIndex: i,
        endIndex: -1,
        children: [],
      };
      target().push(group);
      stack.push(group);
      continue;
    }

    if (GROUP_END_RE.test(stripped)) {
      if (stack.length > 0) {
        stack.pop()!.endIndex = i;
      } else {
        target().push({ kind: "line", index: i, content: raw });
      }
      continue;
    }

    target().push({ kind: "line", index: i, content: raw });
  }

  return root;
}

/**
 * A compiled section rule for client-side application.
 */
export interface CompiledSectionRule {
  id: string;
  displayName: string;
  startPattern: RegExp;
  endPattern: RegExp;
}

/**
 * Compile rule data from the server into RegExp-bearing objects.
 * Invalid patterns are silently skipped.
 */
export function compileSectionRules(
  rules: Array<{
    id: string;
    displayName: string;
    startPattern: string;
    endPattern: string;
    enabledByDefault?: boolean;
  }>,
): CompiledSectionRule[] {
  const compiled: CompiledSectionRule[] = [];
  for (const rule of rules) {
    // Skip rules that are explicitly disabled by default.
    if (rule.enabledByDefault === false) continue;
    try {
      compiled.push({
        id: rule.id,
        displayName: rule.displayName,
        startPattern: new RegExp(rule.startPattern),
        endPattern: new RegExp(rule.endPattern),
      });
    } catch {
      // Skip rules with invalid regex.
    }
  }
  return compiled;
}

/**
 * Apply compiled section rules to a flat list of ConsoleSectionNode[].
 *
 * Walks the top-level lines, matching start/end patterns to create groups.
 * Already-grouped nodes (from marker detection) are left untouched.
 * Rules are applied in order; the first matching rule wins for a given line.
 */
export function applyRulesToSections(
  nodes: ConsoleSectionNode[],
  rules: CompiledSectionRule[],
): ConsoleSectionNode[] {
  if (rules.length === 0) return nodes;

  const result: ConsoleSectionNode[] = [];
  let activeRule: CompiledSectionRule | null = null;
  let activeGroup: ConsoleSectionGroup | null = null;
  const emit = (n: ConsoleSectionNode) =>
    activeGroup ? activeGroup.children.push(n) : result.push(n);

  function openGroup(title: string, index: number, rule: CompiledSectionRule) {
    activeGroup = {
      kind: "group",
      title,
      startIndex: index,
      endIndex: -1,
      children: [],
    };
    activeRule = rule;
  }

  function closeGroup(endIndex: number) {
    activeGroup!.endIndex = endIndex;
    result.push(activeGroup!);
    activeGroup = null;
    activeRule = null;
  }

  for (const node of nodes) {
    if (node.kind === "group") {
      emit(node);
      continue;
    }

    const stripped = stripForDetection(node.content);

    // Check if current line ends an active rule-based group.
    if (activeRule && activeGroup && activeRule.endPattern.test(stripped)) {
      closeGroup(node.index);
      // The end-line may also start a new section (e.g. next Maven phase).
      const m = matchAnyRule(stripped, rules);
      if (m) {
        openGroup(m.title, node.index, m.rule);
      } else {
        result.push(node);
      }
      continue;
    }

    // Check if a new rule-based group starts.
    if (!activeRule) {
      const m = matchAnyRule(stripped, rules);
      if (m) {
        openGroup(m.title, node.index, m.rule);
        continue;
      }
    }

    emit(node);
  }

  if (activeGroup) result.push(activeGroup);
  return result;
}

function matchAnyRule(
  stripped: string,
  rules: CompiledSectionRule[],
): { rule: CompiledSectionRule; title: string } | null {
  for (const rule of rules) {
    const m = rule.startPattern.exec(stripped);
    if (m) {
      return {
        rule,
        title: m[1] || rule.displayName,
      };
    }
  }
  return null;
}

/**
 * Apply server-side annotator boundary events to an existing node tree.
 *
 * Boundary events reference plain-text line indices from the backend.
 * Frontend lines come from progressiveHtml (HTML), so indices may not
 * align 1:1 if Jenkins injects extra HTML-only lines. Boundaries are
 * matched only to ConsoleSectionLine nodes whose `index` exactly equals
 * the boundary's `lineIndex`; boundaries with no exact match are ignored.
 *
 * Only flat lines are grouped; already-grouped nodes are passed through.
 */
export function applyAnnotatorBoundaries(
  nodes: ConsoleSectionNode[],
  boundaries: Array<{
    lineIndex: number;
    type: "START" | "END";
    title?: string;
  }>,
): ConsoleSectionNode[] {
  if (boundaries.length === 0) return nodes;

  const startMap = new Map<number, string>();
  const endSet = new Set<number>();
  for (const b of boundaries) {
    if (b.type === "START") {
      startMap.set(b.lineIndex, b.title ?? "Section");
    } else {
      endSet.add(b.lineIndex);
    }
  }

  const result: ConsoleSectionNode[] = [];
  let activeGroup: ConsoleSectionGroup | null = null;
  const emit = (n: ConsoleSectionNode) =>
    activeGroup ? activeGroup.children.push(n) : result.push(n);

  for (const node of nodes) {
    if (node.kind === "group") {
      emit(node);
      continue;
    }

    const lineIdx = node.index;

    // Check end before start so same-line close+open works.
    if (activeGroup && endSet.has(lineIdx)) {
      activeGroup.endIndex = lineIdx;
      result.push(activeGroup);
      activeGroup = null;
      continue;
    }

    const startTitle = startMap.get(lineIdx);
    if (startTitle) {
      activeGroup = {
        kind: "group",
        title: startTitle,
        startIndex: lineIdx,
        endIndex: -1,
        children: [],
      };
      continue;
    }

    emit(node);
  }

  if (activeGroup) result.push(activeGroup);
  return result;
}
