/** * @vitest-environment jsdom */

import {
  ConsoleSectionGroup,
  ConsoleSectionParser,
  parseConsoleSections,
} from "./parseConsoleSections.ts";

describe("parseConsoleSections", () => {
  it("returns empty array for empty input", () => {
    const result = parseConsoleSections([]);
    expect(result).toEqual([]);
  });

  it("returns flat line nodes for plain lines", () => {
    const lines = ["hello", "world", "foo"];
    const result = parseConsoleSections(lines);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ kind: "line", index: 0, content: "hello" });
    expect(result[1]).toEqual({ kind: "line", index: 1, content: "world" });
    expect(result[2]).toEqual({ kind: "line", index: 2, content: "foo" });
  });

  it("preserves original line indices", () => {
    const lines = ["a", "b", "c", "d"];
    const result = parseConsoleSections(lines);
    for (let i = 0; i < lines.length; i++) {
      expect(result[i]).toMatchObject({ kind: "line", index: i });
    }
  });

  it("handles single line input", () => {
    const result = parseConsoleSections(["only line"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ kind: "line", index: 0, content: "only line" });
  });

  it("preserves ANSI escape sequences in content", () => {
    const lines = ["\x1b[31mred text\x1b[0m", "normal"];
    const result = parseConsoleSections(lines);
    expect(result[0]).toMatchObject({
      kind: "line",
      content: "\x1b[31mred text\x1b[0m",
    });
  });

  describe("Azure DevOps syntax (##[group]/##[endgroup])", () => {
    it("creates a group from ##[group] and ##[endgroup]", () => {
      const lines = [
        "before",
        "##[group]Build",
        "compiling...",
        "done",
        "##[endgroup]",
        "after",
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ kind: "line", content: "before" });
      expect(result[2]).toMatchObject({ kind: "line", content: "after" });

      const group = result[1] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      expect(group.title).toBe("Build");
      expect(group.startIndex).toBe(1);
      expect(group.endIndex).toBe(4);
      expect(group.children).toHaveLength(2);
      expect(group.children[0]).toMatchObject({
        kind: "line",
        index: 2,
        content: "compiling...",
      });
      expect(group.children[1]).toMatchObject({
        kind: "line",
        index: 3,
        content: "done",
      });
    });

    it("leaves the title empty when none provided", () => {
      const lines = ["##[group]", "inside", "##[endgroup]"];
      const result = parseConsoleSections(lines);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe("");
    });

    it("detects markers in CRLF output", () => {
      const lines = ["##[group]Build\r", "inside\r", "##[endgroup]\r"];
      const group = parseConsoleSections(lines)[0] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      expect(group.title).toBe("Build");
      expect(group.endIndex).toBe(2);
    });

    it("trims trailing whitespace in title", () => {
      const lines = [
        "##[group]Install Dependencies  ",
        "npm ci",
        "##[endgroup]",
      ];
      const result = parseConsoleSections(lines);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe("Install Dependencies");
    });
  });

  describe("GitHub Actions syntax (::group::/::endgroup::)", () => {
    it("creates a group from ::group:: and ::endgroup::", () => {
      const lines = [
        "::group::Test Suite",
        "test 1 passed",
        "test 2 passed",
        "::endgroup::",
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);

      const group = result[0] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      expect(group.title).toBe("Test Suite");
      expect(group.startIndex).toBe(0);
      expect(group.endIndex).toBe(3);
      expect(group.children).toHaveLength(2);
    });
  });

  describe("mixed syntax", () => {
    it("handles ##[group] opened and ::endgroup:: closed", () => {
      const lines = ["##[group]Mixed", "inside", "::endgroup::"];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe("Mixed");
      expect(group.endIndex).toBe(2);
    });

    it("handles ::group:: opened and ##[endgroup] closed", () => {
      const lines = ["::group::Mixed2", "inside", "##[endgroup]"];
      const result = parseConsoleSections(lines);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe("Mixed2");
      expect(group.endIndex).toBe(2);
    });
  });

  describe("ANSI stripping for detection", () => {
    it("detects marker wrapped in ANSI codes and preserves ANSI in title", () => {
      const lines = [
        "\x1b[32m##[group]Colored\x1b[0m",
        "inside",
        "\x1b[32m##[endgroup]\x1b[0m",
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      // Marker stripped, surrounding ANSI preserved for color rendering.
      expect(group.title).toBe("\x1b[32mColored\x1b[0m");
    });

    it("preserves ANSI codes placed after the marker", () => {
      const lines = [
        "##[group]\x1b[1;34mBold Blue Title\x1b[0m",
        "inside",
        "##[endgroup]",
      ];
      const result = parseConsoleSections(lines);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe("\x1b[1;34mBold Blue Title\x1b[0m");
    });

    it("detects marker with leading whitespace", () => {
      const lines = ["  ##[group]Indented", "inside", "  ##[endgroup]"];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);
      expect((result[0] as ConsoleSectionGroup).title).toBe("Indented");
    });
  });

  describe("HTML tag stripping for detection (AnsiColor plugin)", () => {
    it("detects marker inside HTML span tags", () => {
      const lines = [
        '<span style="color: #00CD00;">##[group]Green Title</span>',
        "inside",
        '<span style="color: #00CD00;">##[endgroup]</span>',
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      // HTML preserved so dangerouslySetInnerHTML can render the color.
      expect(group.title).toBe(
        '<span style="color: #00CD00;">Green Title</span>',
      );
    });

    it("detects ::group:: inside HTML spans", () => {
      const lines = [
        '<span style="color: blue;">::group::Blue Section</span>',
        "inside",
        '<span style="color: blue;">::endgroup::</span>',
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe(
        '<span style="color: blue;">Blue Section</span>',
      );
    });
  });

  describe("shell trace rejection", () => {
    it("does not treat '+ echo ##[group]...' as a marker", () => {
      const lines = [
        "+ echo ##[group]Build",
        "##[group]Build",
        "compiling",
        "##[endgroup]",
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        kind: "line",
        index: 0,
        content: "+ echo ##[group]Build",
      });
      const group = result[1] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      expect(group.title).toBe("Build");
    });

    it("does not treat '+ echo ::group::...' as a marker", () => {
      const lines = [
        "+ echo ::group::Test",
        "::group::Test",
        "testing",
        "::endgroup::",
      ];
      const result = parseConsoleSections(lines);
      expect(result[0]).toMatchObject({ kind: "line" });
      expect(result[1]).toMatchObject({ kind: "group" });
    });
  });

  describe("Timestamper plugin compatibility", () => {
    it.each([
      [
        "plain HH:MM:SS with ##[group]",
        "11:18:37 ##[group]Compile",
        "11:18:37 content",
        "11:18:37 ##[endgroup]",
      ],
      [
        "plain HH:MM:SS with ::group::",
        "09:05:12 ::group::Docker Build",
        "09:05:12 Step 1/3 : FROM node",
        "09:05:13 ::endgroup::",
      ],
      [
        "full date+time prefix",
        "2026-05-30 11:18:37 ##[group]Build",
        "2026-05-30 11:18:37 compiling...",
        "2026-05-30 11:18:38 ##[endgroup]",
      ],
      [
        "timestamp with milliseconds",
        "11:18:37.456 ##[group]Tests",
        "11:18:37.500 running...",
        "11:18:38.001 ##[endgroup]",
      ],
      [
        "HTML-wrapped timestamp",
        '<span class="timestamp"><b>11:18:37</b> </span>##[group]Build',
        '<span class="timestamp"><b>11:18:37</b> </span>compiling...',
        '<span class="timestamp"><b>11:18:37</b> </span>##[endgroup]',
      ],
      [
        "bracketed ISO format",
        "[2026-05-30T11:18:37.456Z] ##[group]Deploy",
        "[2026-05-30T11:18:37.456Z] deploying...",
        "[2026-05-30T11:18:38.001Z] ##[endgroup]",
      ],
      [
        "bracketed ISO with timezone offset",
        "[2026-05-30T11:18:37.456+0530] ::group::Build",
        "[2026-05-30T11:18:37.500+0530] compiling...",
        "[2026-05-30T11:18:38.001+0530] ::endgroup::",
      ],
      [
        "real Timestamper: visible clock + hidden ISO (dual prefix)",
        '<span class="timestamp"><b>01:08:06</b> </span><span style="display: none">[2026-05-29T19:38:06.669Z]</span> ##[group]Compile All Modules',
        '<span class="timestamp"><b>01:08:06</b> </span><span style="display: none">[2026-05-29T19:38:06.669Z]</span> Starting compilation...',
        '<span class="timestamp"><b>01:08:06</b> </span><span style="display: none">[2026-05-29T19:38:06.669Z]</span> ##[endgroup]',
      ],
    ])("detects markers with %s", (_label, startLine, contentLine, endLine) => {
      const result = parseConsoleSections([startLine, contentLine, endLine]);
      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.kind).toBe("group");
      expect(group.children).toHaveLength(1);
    });

    it("drops the timestamp text from the title but keeps its markup", () => {
      const result = parseConsoleSections([
        '<span class="timestamp"><b>01:08:06</b> </span><span style="display: none">[2026-05-29T19:38:06.669Z]</span> ##[group]Compile',
        "x",
        "##[endgroup]",
      ]);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.title).toBe(
        '<span class="timestamp"><b></b></span><span style="display: none"></span>Compile',
      );
    });

    it("drops a plain-text timestamp from the title", () => {
      const result = parseConsoleSections([
        "11:18:37 ##[group]Compile",
        "x",
        "##[endgroup]",
      ]);
      expect((result[0] as ConsoleSectionGroup).title).toBe("Compile");
    });

    it("ignores a marker inside a tag attribute when building the title", () => {
      const result = parseConsoleSections([
        '<a href="http://x/::group::">::group::Title</a>',
        "x",
        "::endgroup::",
      ]);
      expect((result[0] as ConsoleSectionGroup).title).toBe(
        '<a href="http://x/::group::">Title</a>',
      );
    });
  });

  describe("nesting", () => {
    it("supports nested groups", () => {
      const lines = [
        "##[group]Outer",
        "outer line",
        "##[group]Inner",
        "inner line",
        "##[endgroup]",
        "after inner",
        "##[endgroup]",
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);

      const outer = result[0] as ConsoleSectionGroup;
      expect(outer.title).toBe("Outer");
      expect(outer.children).toHaveLength(3);
      expect(outer.children[0]).toMatchObject({
        kind: "line",
        content: "outer line",
      });

      const inner = outer.children[1] as ConsoleSectionGroup;
      expect(inner.kind).toBe("group");
      expect(inner.title).toBe("Inner");
      expect(inner.children).toHaveLength(1);
      expect(inner.children[0]).toMatchObject({
        kind: "line",
        content: "inner line",
      });

      expect(outer.children[2]).toMatchObject({
        kind: "line",
        content: "after inner",
      });
    });

    it("supports deeply nested groups", () => {
      const lines = [
        "##[group]L1",
        "##[group]L2",
        "##[group]L3",
        "deep",
        "##[endgroup]",
        "##[endgroup]",
        "##[endgroup]",
      ];
      const result = parseConsoleSections(lines);
      const l1 = result[0] as ConsoleSectionGroup;
      const l2 = l1.children[0] as ConsoleSectionGroup;
      const l3 = l2.children[0] as ConsoleSectionGroup;
      expect(l3.children[0]).toMatchObject({
        kind: "line",
        content: "deep",
      });
    });
  });

  describe("unclosed groups", () => {
    it("leaves endIndex as -1 for unclosed group", () => {
      const lines = ["##[group]Streaming", "line 1", "line 2"];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleSectionGroup;
      expect(group.endIndex).toBe(-1);
      expect(group.children).toHaveLength(2);
    });

    it("handles unclosed nested group", () => {
      const lines = ["##[group]Outer", "##[group]Inner", "still going"];
      const result = parseConsoleSections(lines);
      const outer = result[0] as ConsoleSectionGroup;
      expect(outer.endIndex).toBe(-1);
      const inner = outer.children[0] as ConsoleSectionGroup;
      expect(inner.endIndex).toBe(-1);
    });
  });

  describe("stray endgroup", () => {
    it("treats stray ##[endgroup] as a plain line", () => {
      const lines = ["some output", "##[endgroup]", "more output"];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(3);
      expect(result[1]).toMatchObject({
        kind: "line",
        index: 1,
        content: "##[endgroup]",
      });
    });
  });

  describe("multiple groups", () => {
    it("handles sequential sibling groups", () => {
      const lines = [
        "##[group]First",
        "a",
        "##[endgroup]",
        "between",
        "##[group]Second",
        "b",
        "##[endgroup]",
      ];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(3);
      expect((result[0] as ConsoleSectionGroup).title).toBe("First");
      expect(result[1]).toMatchObject({ kind: "line", content: "between" });
      expect((result[2] as ConsoleSectionGroup).title).toBe("Second");
    });
  });

  describe("without markers", () => {
    it("returns flat lines when no markers are present", () => {
      const lines = ["hello", "world", "foo"];
      const result = parseConsoleSections(lines);
      expect(result).toHaveLength(3);
      expect(result.every((n) => n.kind === "line")).toBe(true);
    });
  });
});

describe("line counts", () => {
  it("counts lines in nested groups", () => {
    const lines = [
      "##[group]Outer",
      "a",
      "##[group]Inner",
      "b",
      "c",
      "##[endgroup]",
      "##[endgroup]",
    ];
    const outer = parseConsoleSections(lines)[0] as ConsoleSectionGroup;
    expect(outer.lineCount).toBe(3);
    expect((outer.children[1] as ConsoleSectionGroup).lineCount).toBe(2);
  });
});

describe("ConsoleSectionParser", () => {
  const update = (
    parser: ConsoleSectionParser,
    lines: string[],
    opts: Partial<{
      startByte: number;
      stableCount: number;
      logLineCount: number;
    }> = {},
  ) =>
    parser.update({
      lines,
      startByte: opts.startByte ?? 0,
      stableCount: opts.stableCount ?? lines.length,
      logLineCount: opts.logLineCount ?? lines.length,
    });

  it("produces the same tree incrementally as in one pass", () => {
    const lines = [
      "before",
      "##[group]A",
      "a1",
      "##[group]B",
      "b1",
      "##[endgroup]",
      "a2",
      "##[endgroup]",
      "after",
    ];
    const parser = new ConsoleSectionParser();
    let result;
    for (let n = 1; n <= lines.length; n++) {
      result = update(parser, lines.slice(0, n));
    }
    expect(result).toEqual(parseConsoleSections(lines));
  });

  it("keeps the identity of closed groups and stable lines", () => {
    const parser = new ConsoleSectionParser();
    const lines = ["first", "##[group]A", "a", "##[endgroup]", "##[group]B"];
    const before = update(parser, lines);
    const after = update(parser, [...lines, "b"]);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).not.toBe(before[2]);
    expect((after[2] as ConsoleSectionGroup).children).toHaveLength(1);
  });

  it("does not parse a pending partial line as a marker", () => {
    const parser = new ConsoleSectionParser();
    const pending = update(parser, ["x", "##[gro"], { stableCount: 1 });
    expect(pending.map((n) => n.kind)).toEqual(["line", "line"]);

    const completed = update(parser, ["x", "##[group]Build", "y"], {
      stableCount: 3,
    });
    expect(completed.map((n) => n.kind)).toEqual(["line", "group"]);
  });

  it("places pending lines in the open group and trailing lines at the root", () => {
    const parser = new ConsoleSectionParser();
    const result = update(parser, ["##[group]A", "partial", "exception"], {
      stableCount: 1,
      logLineCount: 2,
    });
    expect(result).toHaveLength(2);
    const group = result[0] as ConsoleSectionGroup;
    expect(group.children).toEqual([
      { kind: "line", index: 1, content: "partial" },
    ]);
    expect(group.lineCount).toBe(1);
    expect(result[1]).toEqual({ kind: "line", index: 2, content: "exception" });
  });

  it("re-parses from scratch when the buffer is re-based", () => {
    const parser = new ConsoleSectionParser();
    update(parser, ["a", "##[endgroup]"], { startByte: 100 });
    const result = update(parser, ["##[group]Older", "a", "##[endgroup]"], {
      startByte: 0,
    });
    expect(result).toHaveLength(1);
    expect((result[0] as ConsoleSectionGroup).title).toBe("Older");
  });
});
