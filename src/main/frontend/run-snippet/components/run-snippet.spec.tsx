/** * @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
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
});
