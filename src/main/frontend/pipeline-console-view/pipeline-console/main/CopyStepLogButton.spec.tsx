/** * @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CopyStepLogButton from "./CopyStepLogButton.tsx";

describe("CopyStepLogButton", () => {
  const writeText = vi.fn();
  const show = vi.fn();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    show.mockReset();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("notificationBar", { show, SUCCESS: "ok", ERROR: "err" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies the full step log without ANSI escapes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("\x1b[31mred\x1b[0m line\nsecond line\n", {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CopyStepLogButton logUrl="/jenkins/job/a/1/stages/log?nodeId=7" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy step output" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("red line\nsecond line\n"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/jenkins/job/a/1/stages/log?nodeId=7",
    );
    expect(show).toHaveBeenCalledWith(
      "Copied step output to the clipboard",
      "ok",
    );
  });

  it("reports an error and copies nothing when the log can't be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 404 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<CopyStepLogButton logUrl="log?nodeId=7" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy step output" }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith("Could not copy step output", "err"),
    );
    expect(writeText).not.toHaveBeenCalled();
  });
});
