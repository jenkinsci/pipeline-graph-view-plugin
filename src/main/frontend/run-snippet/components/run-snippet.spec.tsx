/** * @vitest-environment jsdom */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const renderSnippet = (stages: StageInfo[]) =>
  render(
    <RunSnippet
      run={{ stages, complete: false }}
      currentRunPath="/jenkins/job/example/2/stages?selected-node="
      runPath="/jenkins/job/example/2/"
    />,
  );

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

describe("RunSnippet pending input", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.crumb = {
      wrap: vi.fn().mockReturnValue({ "Jenkins-Crumb": "crumb" }),
    };
  });

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
              canProceed: true,
              canAbort: true,
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
              canProceed: true,
              canAbort: true,
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
              canProceed: true,
              canAbort: true,
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
              canProceed: true,
              canAbort: true,
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
              canProceed: true,
              canAbort: true,
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

  describe("in a matrix", () => {
    const input = (id: string) => ({
      id,
      message: `Approve ${id}?`,
      ok: `Approve ${id}`,
      cancel: "Abort",
      parameters: false,
      canProceed: true,
      canAbort: true,
    });

    const matrix = (
      id: number,
      configurations: Array<[string, StageInfo]>,
    ): StageInfo =>
      stage({
        id,
        name: "Matrix",
        state: Result.paused,
        children: configurations.map(([platform, child], index) =>
          stage({
            id: id * 10 + index,
            type: "PARALLEL",
            name: `Matrix - PLATFORM = '${platform}'`,
            state: child.state,
            children: [child],
          }),
        ),
      });

    it("offers the input of every configuration of a stage hidden in a collapsed marker", async () => {
      renderSnippet([
        stage({ id: 1, name: "Checkout" }),
        matrix(2, [
          [
            "linux",
            stage({
              id: 100,
              name: "Approve",
              state: Result.paused,
              inputStep: input("Linux"),
            }),
          ],
          [
            "windows",
            stage({
              id: 101,
              name: "Approve",
              state: Result.paused,
              inputStep: input("Windows"),
            }),
          ],
        ]),
        stage({ id: 3, name: "Package" }),
        stage({ id: 4, name: "Test", state: Result.failure }),
        stage({ id: 5, name: "Publish" }),
      ]);
      fireEvent.mouseEnter(
        document.querySelector(".pgv-run-snippet__collapsed")!,
      );

      expect(await screen.findByText("Approve Linux?")).toBeInTheDocument();
      expect(screen.getByText("Approve Windows?")).toBeInTheDocument();
      expect(screen.getAllByText(/^Approve (Linux|Windows)\?$/)).toHaveLength(
        2,
      );
    });

    it("offers the input of a configuration's nested stage", async () => {
      renderSnippet([
        matrix(2, [
          [
            "linux",
            stage({
              id: 100,
              name: "Release",
              state: Result.paused,
              children: [
                stage({
                  id: 101,
                  name: "Sign-off",
                  state: Result.paused,
                  inputStep: input("Linux"),
                }),
              ],
            }),
          ],
        ]),
      ]);
      fireEvent.mouseEnter(document.querySelector(".pgv-run-snippet a")!);

      expect(await screen.findByText("Approve Linux?")).toBeInTheDocument();
      expect(screen.getByText("Sign-off")).toBeInTheDocument();
    });
  });
});

describe("RunSnippet current stage", () => {
  const NOW = 1_800_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const summaryOf = (stages: StageInfo[]) => {
    const { container } = renderSnippet(stages);
    return [
      ...container.querySelector(".pgv-run-snippet__summary")!.children,
    ].map((part) => part.textContent);
  };

  it("shows the running stage's name and how long it has been running", () => {
    expect(
      summaryOf([
        stage({ id: 1, name: "Checkout" }),
        stage({
          id: 2,
          name: "Build",
          state: Result.running,
          // Live durations show a second behind, see Since
          startTimeMillis: NOW - 66_000,
          totalDurationMillis: undefined,
        }),
        stage({ id: 3, name: "Test", state: Result.not_built, skeleton: true }),
      ]),
    ).toEqual(["2 of 3 stages", "·", "Build", "1m 5s"]);
  });

  it("shows how long a stage has been waiting for input", () => {
    expect(
      summaryOf([
        stage({
          id: 1,
          name: "Approve",
          state: Result.paused,
          startTimeMillis: NOW - 4_000,
          totalDurationMillis: undefined,
        }),
      ]),
    ).toEqual(["1 stage", "·", "Approve", "3s"]);
  });

  it("doesn't treat a queued stage as started", () => {
    expect(
      summaryOf([
        stage({ id: 1, name: "Checkout" }),
        stage({
          id: 2,
          name: "Deploy",
          state: Result.queued,
          totalDurationMillis: undefined,
        }),
      ]),
    ).toEqual(["2 stages"]);
  });

  it("only counts the stages once the run has finished", () => {
    expect(
      summaryOf([
        stage({ id: 1, name: "Checkout" }),
        stage({ id: 2, name: "Build", state: Result.failure }),
      ]),
    ).toEqual(["2 stages"]);
  });
});
