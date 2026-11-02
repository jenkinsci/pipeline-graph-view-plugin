import { render } from "@testing-library/react";

import { makeReactChildren, tokenizeANSIString } from "./Ansi";

describe("ANSI rendering", () => {
  it("renders escaped arrows inside ANSI-colored text correctly", () => {
    const input =
      'input = "bigquery.googleapis.com" \x1b[33m-&gt;\x1b[0m "cloudbuild.googleapis.com"';

    const { container } = render(
      <>{makeReactChildren(tokenizeANSIString(input), "test-line")}</>,
    );

    expect(container.textContent).toContain(
      'input = "bigquery.googleapis.com" -> "cloudbuild.googleapis.com"',
    );

    expect(container.textContent).not.toContain("-&gt;");
  });
});
