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
  it("preserves safe Jenkins relative links", () => {
    const { container } = renderConsoleLine(
      'Starting building: <a href="/jenkins/job/downstream/1/stages">downstream #1</a>',
    );

    const link = container.querySelector(".console-text a");

    expect(link).toHaveTextContent("downstream #1");
    expect(link).toHaveAttribute("href", "/jenkins/job/downstream/1/stages");
  });
});
