/** * @vitest-environment jsdom */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { Result, StepInfo } from "../PipelineConsoleModel.tsx";
import InputStep from "./InputStep.tsx";

const RUN_PATH = "/jenkins/job/name/1/";

function makeStep(parameters: boolean): StepInfo {
  return {
    name: "Input",
    title: "Input",
    state: Result.paused,
    id: "step-1",
    type: "INPUT",
    pauseDurationMillis: 0,
    startTimeMillis: 0,
    totalDurationMillis: 0,
    stageId: "stage-1",
    inputStep: {
      id: "input-id",
      message: "Continue?",
      ok: "Proceed",
      cancel: "Abort",
      parameters,
    },
  };
}

beforeEach(() => {
  // jsdom does not implement HTMLDialogElement methods.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
  window.crumb = { wrap: (h) => h };
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  document.querySelectorAll("dialog.jenkins-dialog").forEach((d) => d.remove());
});

describe("InputStep", () => {
  it("renders inline OK/Cancel and POSTs proceedEmpty when no parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { getByText } = render(
      <InputStep step={makeStep(false)} currentRunPath={RUN_PATH} />,
    );
    fireEvent.click(getByText("Proceed"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("../input/input-id/proceedEmpty");
    expect(init.method).toBe("POST");
  });

  it("POSTs abort when cancel is clicked (no parameters)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { getByText } = render(
      <InputStep step={makeStep(false)} currentRunPath={RUN_PATH} />,
    );
    fireEvent.click(getByText("Abort"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock.mock.calls[0][0]).toBe("../input/input-id/abort");
  });

  it("opens a dialog with the fetched form when parameters are present", async () => {
    const dialogHtml = `
      <form class="input-step-dialog-form" action="dialogSubmit" method="post">
        <input type="text" name="value" value="hello"/>
        <button type="submit" name="proceed">Proceed</button>
        <button type="submit" name="abort">Abort</button>
      </form>`;
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.endsWith("/dialog")) {
        return { ok: true, text: async () => dialogHtml } as Response;
      }
      return { ok: true } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getByText } = render(
      <InputStep step={makeStep(true)} currentRunPath={RUN_PATH} />,
    );
    fireEvent.click(getByText("Proceed"));

    await waitFor(() => {
      expect(document.querySelector("dialog.jenkins-dialog")).not.toBeNull();
    });
    expect(
      document.querySelector(
        "dialog.jenkins-dialog form.input-step-dialog-form",
      ),
    ).not.toBeNull();
  });

  it("submits the dialog form to dialogSubmit with inputAction=proceed and parameter json", async () => {
    const dialogHtml = `
      <form class="input-step-dialog-form" action="dialogSubmit" method="post">
        <div class="jenkins-form-item--medium">
          <input type="hidden" name="name" value="MESSAGE"/>
          <input type="text" name="value" value="hello"/>
        </div>
        <div class="jenkins-form-item--medium">
          <input type="hidden" name="name" value="action"/>
          <select name="value"><option value="continue" selected>continue</option></select>
        </div>
        <button type="submit" name="proceed">Proceed</button>
        <button type="submit" name="abort">Abort</button>
      </form>`;
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.endsWith("/dialog")) {
        return { ok: true, text: async () => dialogHtml } as Response;
      }
      return { ok: true } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getByText } = render(
      <InputStep step={makeStep(true)} currentRunPath={RUN_PATH} />,
    );
    fireEvent.click(getByText("Proceed"));

    const proceedBtn = await waitFor(() => {
      const btn = document.querySelector(
        "dialog.jenkins-dialog button[name='proceed']",
      ) as HTMLButtonElement | null;
      if (!btn) throw new Error("not yet");
      return btn;
    });
    proceedBtn.click();

    await waitFor(() => {
      const submitCall = (fetchMock as Mock).mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === "string" &&
          (c[0] as string).endsWith("/dialogSubmit"),
      );
      expect(submitCall).toBeDefined();
    });
    const submitCall = (fetchMock as Mock).mock.calls.find(
      (c: unknown[]) =>
        typeof c[0] === "string" && (c[0] as string).endsWith("/dialogSubmit"),
    );
    const init = submitCall![1] as RequestInit;
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body.get("inputAction")).toBe("proceed");
    const payload = JSON.parse(body.get("json") as string);
    expect(payload).toEqual({
      parameter: [
        { name: "MESSAGE", value: "hello" },
        { name: "action", value: "continue" },
      ],
      inputAction: "proceed",
    });
  });
});
