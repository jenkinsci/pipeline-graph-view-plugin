/** * @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InputStepControls from "./input-step-controls.tsx";

const input = {
  id: "Deploy",
  message: "Deploy to production?",
  ok: "Deploy",
  cancel: "Abort",
  parameters: false,
  canProceed: true,
  canAbort: true,
};

describe("InputStepControls", () => {
  const fetchMock = vi.fn();
  const show = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    show.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.crumb = { wrap: vi.fn().mockReturnValue({}) };
    window.notificationBar = { show, ERROR: "error" };
  });

  const renderControls = (overrides: Partial<typeof input> = {}) =>
    render(
      <InputStepControls
        input={{ ...input, ...overrides }}
        baseUrl="/job/x/1/input/Deploy/"
      />,
    );

  it("only offers abort to a user who can't proceed", () => {
    renderControls({ canProceed: false });

    expect(screen.queryByRole("button", { name: "Deploy" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abort" })).toBeInTheDocument();
  });

  it("offers nothing to a user who can neither proceed nor abort", () => {
    const { container } = renderControls({
      canProceed: false,
      canAbort: false,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("shows why the input step refused the submission", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html></html>", {
        status: 400,
        headers: { "X-Error": "You need to be bob to submit this." },
      }),
    );
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        "You need to be bob to submit this.",
        "error",
      ),
    );
  });

  it("says when the input was already submitted", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Abort" }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        "This input has already been submitted",
        "error",
      ),
    );
  });

  it("reports a failed request", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        "Submitting the input failed: TypeError: Failed to fetch",
        "error",
      ),
    );
  });

  it("doesn't show a notification when the submission succeeds", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(show).not.toHaveBeenCalled();
  });
});
