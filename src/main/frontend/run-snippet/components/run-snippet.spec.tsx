/** * @vitest-environment jsdom */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import RunSnippet from "./run-snippet.tsx";

vi.mock("../../common/components/input-step-dialog.ts", () => ({
  openInputStepDialog: vi.fn(),
}));

const stage = (overrides: Partial<StageInfo>): StageInfo => ({
  name: "Build",
  title: "Build",
  state: Result.success,
  id: 1,
  type: "STAGE",
  children: [],
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 1000,
  agent: "built-in",
  url: "",
  ...overrides,
});

describe("RunSnippet pending input", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    window.crumb = {
      wrap: vi.fn().mockReturnValue({ "Jenkins-Crumb": "crumb" }),
    };
  });

  const renderSnippet = (stages: StageInfo[]) =>
    render(
      <RunSnippet
        run={{ stages, complete: false }}
        currentRunPath="/jenkins/job/example/2/stages?selected-node="
        runPath="/jenkins/job/example/2/"
      />,
    );

  const hoverStage = (id: number) =>
    fireEvent.mouseEnter(
      document.querySelector(`a[href$="selected-node=${id}"]`)!,
    );

  it("submits each pending input of a stage's parallel branches", async () => {
    renderSnippet([
      stage({ id: 1 }),
      stage({
        id: 2,
        name: "Sign-off",
        state: Result.paused,
        pendingInputs: [
          {
            stageId: 3,
            stageName: "QA",
            input: {
              id: "QA",
              message: "QA sign-off?",
              ok: "Approve QA",
              cancel: "Reject QA",
              parameters: false,
            },
          },
          {
            stageId: 4,
            stageName: "Security approval",
            input: {
              id: "Sec",
              message: "Security approves?",
              ok: "Approve security",
              cancel: "Reject security",
              parameters: false,
            },
          },
        ],
      }),
    ]);
    hoverStage(2);

    expect(await screen.findByText("QA sign-off?")).toBeInTheDocument();
    expect(screen.getByText("Security approves?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve security" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/jenkins/job/example/2/input/Sec/proceedEmpty",
      { method: "POST", headers: { "Jenkins-Crumb": "crumb" } },
    );
  });

  it("aborts a stage's own input", async () => {
    renderSnippet([
      stage({
        id: 2,
        name: "Approve",
        state: Result.paused,
        pendingInputs: [
          {
            stageId: 2,
            stageName: "Approve",
            input: {
              id: "Deploy",
              message: "Deploy to production?",
              ok: "Deploy",
              cancel: "Abort",
              parameters: false,
            },
          },
        ],
      }),
    ]);
    hoverStage(2);

    fireEvent.click(await screen.findByRole("button", { name: "Abort" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/jenkins/job/example/2/input/Deploy/abort",
      { method: "POST", headers: { "Jenkins-Crumb": "crumb" } },
    );
  });

  it("submits the input of a paused matrix configuration", async () => {
    const approve = (id: number, state: Result, inputId?: string) =>
      stage({
        id,
        name: "Approve",
        state,
        inputStep: inputId
          ? {
              id: inputId,
              message: `Approve ${inputId}?`,
              ok: `Approve ${inputId}`,
              cancel: "Abort",
              parameters: false,
            }
          : undefined,
      });
    renderSnippet([
      stage({
        id: 2,
        name: "Matrix",
        state: Result.paused,
        children: [
          stage({
            id: 3,
            type: "PARALLEL",
            name: "Matrix - PLATFORM = 'linux'",
            state: Result.paused,
            children: [approve(4, Result.paused, "Linux")],
          }),
          stage({
            id: 5,
            type: "PARALLEL",
            name: "Matrix - PLATFORM = 'windows'",
            state: Result.success,
            children: [approve(6, Result.success)],
          }),
        ],
      }),
    ]);
    fireEvent.mouseEnter(document.querySelector(".pgv-run-snippet a")!);

    expect(await screen.findByText("Approve Linux?")).toBeInTheDocument();
    expect(screen.queryByText("Approve undefined?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Approve Linux" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/jenkins/job/example/2/input/Linux/proceedEmpty",
      { method: "POST", headers: { "Jenkins-Crumb": "crumb" } },
    );
  });

  it("moves keyboard focus into the input tooltip", async () => {
    renderSnippet([
      stage({
        id: 2,
        name: "Approve",
        state: Result.paused,
        pendingInputs: [
          {
            stageId: 2,
            stageName: "Approve",
            input: {
              id: "Deploy",
              message: "Deploy to production?",
              ok: "Deploy",
              cancel: "Abort",
              parameters: false,
            },
          },
        ],
      }),
    ]);
    const link = document.querySelector<HTMLAnchorElement>(
      'a[href$="selected-node=2"]',
    )!;
    // jsdom doesn't report :focus-visible while handling focusin, so treat this as keyboard focus
    const matches = link.matches.bind(link);
    vi.spyOn(link, "matches").mockImplementation(
      (selector) => selector === ":focus-visible" || matches(selector),
    );
    act(() => link.focus());

    const deploy = await screen.findByRole("button", { name: "Deploy" });
    await waitFor(() => expect(deploy).toHaveFocus());

    fireEvent.keyDown(deploy, { key: "Tab", shiftKey: true });
    expect(link).toHaveFocus();
  });
});
