import { render } from "@testing-library/react";

import { ConsoleLine, type ConsoleLineProps } from "./ConsoleLine.tsx";

const defaultProps: ConsoleLineProps = {
  stopTailingLogs: () => {},
  lineNumber: "1",
  content: "",
  stepId: "step-1",
  startByte: 0,
  currentRunPath: "/jenkins/job/name/1/",
};

function renderConsoleLine(content: string) {
  return render(<ConsoleLine {...defaultProps} content={content} />);
}

describe("ConsoleLine", () => {
  it("removes unsafe html from ANSI-styled console content", () => {
    const maliciousContent = [
      "\u001b[31merror",
      '<script>alert("xss")</script>',
      '<img src=x onerror="alert(1)">',
      '<a href="javascript:alert(1)">unsafe link</a>',
      '<a href="data:text/html,<script>alert(1)</script>">data link</a>',
      "for details\u001b[0m",
    ].join(" ");

    const { container } = renderConsoleLine(maliciousContent);
    const consoleText = container.querySelector(".console-text")!;

    expect(consoleText.querySelector("script")).not.toBeInTheDocument();
    expect(consoleText.querySelector("img")).not.toBeInTheDocument();
    expect(consoleText.querySelector("[onerror]")).not.toBeInTheDocument();
    expect(
      consoleText.querySelector('a[href^="javascript:"]'),
    ).not.toBeInTheDocument();
    expect(
      consoleText.querySelector('a[href^="data:"]'),
    ).not.toBeInTheDocument();

    expect(consoleText).toHaveTextContent("error");
    expect(consoleText).toHaveTextContent("unsafe link");
    expect(consoleText).toHaveTextContent("data link");
    expect(consoleText).toHaveTextContent("for details");
  });
  // https://github.com/jenkinsci/pipeline-graph-view-plugin/issues/950
  it("renders a link that Jenkins annotated with a trailing ANSI reset", () => {
    const { container } = renderConsoleLine(
      "This \u001b[0;32m <a href='http://example.com\u001b[0m'>http://example.com\u001b[0m</a> is a link ",
    );
    const consoleText = container.querySelector(".console-text")!;
    const links = consoleText.querySelectorAll("a");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "http://example.com");
    expect(links[0]).toHaveTextContent("http://example.com");
    expect(links[0].querySelector(".ansi-fg-2")).toHaveTextContent(
      "http://example.com",
    );
    expect(consoleText.textContent).toBe("This  http://example.com is a link ");
  });

  it("renders a link that only the console view linkifies next to an ANSI reset", () => {
    const { container } = renderConsoleLine(
      "This \u001b[0;32m http://example.com\u001b[0m is a link ",
    );
    const consoleText = container.querySelector(".console-text")!;
    const links = consoleText.querySelectorAll("a");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "http://example.com");
    expect(consoleText.textContent).toBe("This  http://example.com is a link ");
  });

  it("keeps the timestamp and colours on an ANSI line with a link", () => {
    const { container } = renderConsoleLine(
      "<span class=\"timestamp\"><b>09:03:56</b> </span>Visit \u001b[32m<a href='https://jenkins.io\u001b[0m'>https://jenkins.io\u001b[0m</a> now",
    );
    const consoleText = container.querySelector(".console-text")!;

    expect(consoleText.querySelector(".timestamp")).toHaveTextContent(
      "09:03:56",
    );
    expect(consoleText.querySelector("a")).toHaveAttribute(
      "href",
      "https://jenkins.io",
    );
    expect(consoleText.textContent).toBe(
      "09:03:56 Visit https://jenkins.io now",
    );
  });

  it("drops an OSC 8 hyperlink whose URL Jenkins has annotated", () => {
    const url = "http://example.com\u001b\\Example\u001b]8;;\u001b\\";
    const { container } = renderConsoleLine(
      `see \u001b]8;;<a href='${url}'>${url}</a> now`,
    );
    const consoleText = container.querySelector(".console-text")!;

    expect(consoleText.querySelector("a")).toBeNull();
    expect(consoleText.textContent).toBe("see Example now");
  });

  it("colours ANSI text without links", () => {
    const { container } = renderConsoleLine(
      "    dxtbx      \u001b[0m[ \u001b[32mOK\u001b[0m ]",
    );
    const consoleText = container.querySelector(".console-text")!;

    expect(consoleText.querySelector(".ansi-fg-2")).toHaveTextContent("OK");
    expect(consoleText.textContent).toBe("    dxtbx      [ OK ]");
  });

  it("preserves safe Jenkins relative links", () => {
    const { container } = renderConsoleLine(
      'Starting building: <a href="/jenkins/job/downstream/1/stages">downstream #1</a>',
    );

    const link = container.querySelector(".console-text a");

    expect(link).toHaveTextContent("downstream #1");
    expect(link).toHaveAttribute("href", "/jenkins/job/downstream/1/stages");
  });
});
