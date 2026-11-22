import {
  classifyConsoleLines,
  LineClassifier,
  visibleText,
} from "./classifyConsoleLines.ts";
import { parseConsoleSections } from "./parseConsoleSections.ts";

describe("classifyConsoleLines", () => {
  it.each([
    "[ERROR] Tests run: 3, Failures: 1, Errors: 0, Skipped: 0",
    "ERROR: script returned exit code 1",
    "src/main.c:12:5: error: expected ';'",
    "src/app.ts(4,10): error TS2304: Cannot find name 'foo'.",
    "org.opentest4j.AssertionFailedError: expected: <a> but was: <b>",
    "java.lang.NullPointerException",
    "TypeError: undefined is not a function",
    'Exception in thread "main" java.lang.RuntimeException: boom',
    "npm ERR! code ELIFECYCLE",
    "npm error code 1",
    "[INFO] BUILD FAILURE",
    "FAILURE: Build failed with an exception.",
    "--- FAIL: TestSomething (0.00s)",
    "panic: runtime error: index out of range",
    "Finished: FAILURE",
  ])("flags %j as an error", (line) => {
    expect(classifyConsoleLines([line])).toEqual(["error"]);
  });

  it.each([
    "[WARNING] Using platform encoding",
    "WARNING: An illegal reflective access operation has occurred",
    "src/main.c:3:1: warning: unused variable",
    "npm WARN deprecated foo@1.0.0",
  ])("flags %j as a warning", (line) => {
    expect(classifyConsoleLines([line])).toEqual(["warning"]);
  });

  it.each([
    "[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0",
    "Errors: 0",
    "Compiling ErrorHandler.java",
    "ExceptionMapper registered",
    "No errors found",
    "Running com.example.ErrorTest",
    "[INFO] BUILD SUCCESS",
    "    at the end of the day",
  ])("leaves %j alone", (line) => {
    expect(classifyConsoleLines([line])).toEqual([undefined]);
  });

  it("includes a Java stack trace below an error", () => {
    expect(
      classifyConsoleLines([
        "org.opentest4j.AssertionFailedError: expected: <8> but was: <7>",
        "\tat org.junit.jupiter.api.AssertEquals.failNotEqual(AssertEquals.java:197)",
        "\tat java.base/java.util.ArrayList.forEach(ArrayList.java:1596)",
        "Caused by: java.io.IOException: closed",
        "\tat java.io.Foo.bar(Foo.java:1)",
        "Caused: hudson.AbortException: wrapped",
        "\t... 12 more",
        "",
        "[INFO] Results:",
      ]),
    ).toEqual([
      "error",
      "error",
      "error",
      "error",
      "error",
      "error",
      "error",
      undefined,
      undefined,
    ]);
  });

  it("includes a Python traceback", () => {
    expect(
      classifyConsoleLines([
        "Traceback (most recent call last):",
        '  File "main.py", line 3, in <module>',
        "    main()",
        "ValueError: bad value",
        "    indented but unrelated",
      ]),
    ).toEqual(["error", "error", "error", "error", undefined]);
  });

  it("ignores stack-frame-like lines without an error above", () => {
    expect(
      classifyConsoleLines(["Starting", "    at 10:00 we deploy"]),
    ).toEqual([undefined, undefined]);
  });

  it("reads through markup, ANSI codes and Timestamper prefixes", () => {
    const line =
      '<span class="timestamp"><b>12:00:01</b> </span>\u001b[31m[ERROR]\u001b[0m &lt;boom&gt;';
    expect(visibleText(line)).toBe("[ERROR] <boom>");
    expect(new LineClassifier().classify(line)).toBe("error");
  });
});

describe("parseConsoleSections severity", () => {
  it("annotates line nodes and resets at section markers", () => {
    const nodes = parseConsoleSections([
      "java.lang.IllegalStateException: boom",
      "::group::Next",
      "    at not.a.Frame(After.java:1)",
      "::endgroup::",
      "plain",
    ]);
    expect(nodes[0]).toEqual({
      kind: "line",
      index: 0,
      content: "java.lang.IllegalStateException: boom",
      severity: "error",
    });
    const group = nodes[1];
    expect(group.kind === "group" && group.children[0]).toEqual({
      kind: "line",
      index: 2,
      content: "    at not.a.Frame(After.java:1)",
    });
    expect(nodes[2]).toEqual({ kind: "line", index: 4, content: "plain" });
  });
});
