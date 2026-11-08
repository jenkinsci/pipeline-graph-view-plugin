import { ansiToHtml } from "./Ansi.tsx";

describe("ansiToHtml", () => {
  it("leaves text without escape codes alone", () => {
    expect(ansiToHtml('Building <a href="/job/x/">x</a>')).toBe(
      'Building <a href="/job/x/">x</a>',
    );
  });

  it("wraps styled text in spans and resets", () => {
    expect(ansiToHtml("a \x1b[1;31mred\x1b[0m b")).toBe(
      'a <span class="ansi-fg-1 ansi-bold">red</span> b',
    );
  });

  it("keeps escaped entities inside styled text", () => {
    expect(ansiToHtml('"bigquery" \x1b[33m-&gt;\x1b[0m "cloudbuild"')).toBe(
      '"bigquery" <span class="ansi-fg-3">-&gt;</span> "cloudbuild"',
    );
  });

  it("does not let generated spans cross existing markup", () => {
    expect(ansiToHtml("\x1b[32mgo <b>now</b> ok\x1b[0m")).toBe(
      '<span class="ansi-fg-2">go </span><b><span class="ansi-fg-2">now</span></b><span class="ansi-fg-2"> ok</span>',
    );
  });

  it("drops escape codes inside tags", () => {
    expect(
      ansiToHtml(
        "\x1b[32m<a href='http://example.com\x1b[0m'>http://example.com\x1b[0m</a> x",
      ),
    ).toBe(
      "<a href='http://example.com'><span class=\"ansi-fg-2\">http://example.com</span></a> x",
    );
  });

  it("drops escape codes that are not colours", () => {
    expect(ansiToHtml("a\x1b[2Kb\x1b(Bc\x1b[50Gd\x1b")).toBe("abcd");
  });

  it("does not end a tag at a > inside a quoted attribute value", () => {
    expect(ansiToHtml('\x1b[32m<a href="/x?a>b">link</a>\x1b[0m')).toBe(
      '<a href="/x?a>b"><span class="ansi-fg-2">link</span></a>',
    );
  });

  it("drops OSC sequences such as terminal hyperlinks", () => {
    expect(
      ansiToHtml(
        "see \x1b]8;;http://example.com\x1b\\Example\x1b]8;;\x1b\\ now",
      ),
    ).toBe("see Example now");
    expect(
      ansiToHtml("see \x1b]8;;http://example.com\x07Example\x1b]8;;\x07 now"),
    ).toBe("see Example now");
  });

  it("drops a colour code cut off at the end of the line", () => {
    expect(ansiToHtml("a\x1b[31")).toBe("a");
  });

  it("ignores 256-colour and truecolour arguments", () => {
    expect(ansiToHtml("\x1b[38;5;31mx\x1b[0m")).toBe("x");
    expect(ansiToHtml("\x1b[48;2;30;30;30mx\x1b[0m")).toBe("x");
    expect(ansiToHtml("\x1b[1;38;2;200;100;1;4mx\x1b[0m")).toBe(
      '<span class="ansi-bold ansi-underline">x</span>',
    );
  });
});
