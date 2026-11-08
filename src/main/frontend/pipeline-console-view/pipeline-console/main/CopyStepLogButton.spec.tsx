/** * @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CopyStepLogButton from "./CopyStepLogButton.tsx";

const LOG_URL = "/jenkins/job/a/1/stages/log?nodeId=7";
const RAW_LOG =
  "\x1b[31mred\x1b[0m line\n" +
  "see \x1b]8;;https://example.com\x07the docs\x1b]8;;\x07\n" +
  "st \x1b]8;;https://example.com\x1b\\terminated\x1b]8;;\x1b\\\n";
const PLAIN_LOG = "red line\nsee the docs\nst terminated\n";

class FakeClipboardItem {
  constructor(readonly items: Record<string, Promise<Blob>>) {}
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((_resolve) => (resolve = _resolve));
  return { promise, resolve };
}

describe("CopyStepLogButton", () => {
  const show = vi.fn();

  beforeEach(() => {
    show.mockReset();
    vi.stubGlobal("notificationBar", { show, SUCCESS: "ok", ERROR: "err" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const clickCopy = () => {
    render(<CopyStepLogButton logUrl={LOG_URL} />);
    const button = screen.getByRole("button", { name: "Copy step output" });
    fireEvent.click(button);
    return button;
  };

  describe("with writeText only", () => {
    const writeText = vi.fn();

    beforeEach(() => {
      writeText.mockReset().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
    });

    it("copies the full step log without escape sequences", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(RAW_LOG));
      vi.stubGlobal("fetch", fetchMock);

      clickCopy();

      await waitFor(() => expect(writeText).toHaveBeenCalledWith(PLAIN_LOG));
      expect(fetchMock).toHaveBeenCalledWith(LOG_URL);
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

      const button = clickCopy();

      await waitFor(() =>
        expect(show).toHaveBeenCalledWith("Could not copy step output", "err"),
      );
      expect(writeText).not.toHaveBeenCalled();
      await waitFor(() => expect(button).toBeEnabled());
    });
  });

  it("doesn't download the log when there is no clipboard", async () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const button = clickCopy();

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith("Could not copy step output", "err"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toBeEnabled());
  });

  describe("with ClipboardItem", () => {
    const write = vi.fn();

    beforeEach(() => {
      vi.stubGlobal("ClipboardItem", FakeClipboardItem);
      // Like browsers, settle the write only once the item's data has resolved.
      write
        .mockReset()
        .mockImplementation(async (items: FakeClipboardItem[]) => {
          await items[0].items["text/plain"];
        });
      vi.stubGlobal("navigator", { clipboard: { write, writeText: vi.fn() } });
    });

    it("starts the write before the log has been fetched", async () => {
      const response = deferred<Response>();
      vi.stubGlobal(
        "fetch",
        vi.fn(() => response.promise),
      );

      clickCopy();

      await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
      expect(show).not.toHaveBeenCalled();

      response.resolve(new Response(RAW_LOG));

      const item: FakeClipboardItem = write.mock.calls[0][0][0];
      const blob = await item.items["text/plain"];
      expect(blob.type).toBe("text/plain");
      expect(await blob.text()).toBe(PLAIN_LOG);
      await waitFor(() =>
        expect(show).toHaveBeenCalledWith(
          "Copied step output to the clipboard",
          "ok",
        ),
      );
    });

    it("reports an error when the log can't be fetched", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("boom", { status: 500 })),
      );

      const button = clickCopy();

      await waitFor(() =>
        expect(show).toHaveBeenCalledWith("Could not copy step output", "err"),
      );
      await waitFor(() => expect(button).toBeEnabled());
    });
  });
});
