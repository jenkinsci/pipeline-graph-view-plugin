/** * @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "../i18n/index.ts";
import { InputStep } from "../RestClient.tsx";
import InputApprovers from "./input-approvers.tsx";

const input: InputStep = {
  id: "Deploy",
  message: "Deploy to production?",
  ok: "Deploy",
  cancel: "Abort",
  parameters: false,
  canProceed: false,
  canAbort: false,
};

describe("InputApprovers", () => {
  it("lists who can approve the input as alternatives", () => {
    render(
      <InputApprovers
        input={{ ...input, approvers: ["Alice", "release-team"] }}
      />,
    );

    expect(
      screen.getByText("Waiting for approval from Alice or release-team"),
    ).toBeInTheDocument();
  });

  it("names a single approver", () => {
    render(<InputApprovers input={{ ...input, approvers: ["Alice"] }} />);

    expect(
      screen.getByText("Waiting for approval from Alice"),
    ).toBeInTheDocument();
  });

  it("lists the approvers in the user's language", () => {
    render(
      <LocaleProvider locale="de">
        <InputApprovers
          input={{ ...input, approvers: ["Alice", "Bob", "release-team"] }}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByText(/Alice, Bob oder release-team$/),
    ).toBeInTheDocument();
  });

  it("shows nothing when anyone who can build the job can approve it", () => {
    const { container } = render(<InputApprovers input={input} />);

    expect(container).toBeEmptyDOMElement();
  });
});
