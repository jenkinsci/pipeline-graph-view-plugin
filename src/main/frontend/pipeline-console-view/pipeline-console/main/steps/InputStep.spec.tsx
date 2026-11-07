/** * @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { openInputStepDialog } from "../../../../common/components/input-step-dialog.ts";
import { StepInfo } from "../../../../common/RestClient.tsx";
import { Result } from "../../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import InputStep from "./InputStep.tsx";

vi.mock("../../../../common/components/input-step-dialog.ts", () => ({
  openInputStepDialog: vi.fn(),
}));

const step: StepInfo = {
  name: "Approval",
  title: "Approval",
  state: Result.paused,
  id: "6",
  type: "STEP",
  stageId: "1",
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 0,
  inputStep: {
    message: "Sign this?",
    ok: "Yes",
    cancel: "Skip",
    id: "input-id",
    parameters: true,
  },
};

describe("InputStep", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.crumb = {
      wrap: vi.fn().mockReturnValue({ "Jenkins-Crumb": "crumb" }),
    };
    vi.mocked(openInputStepDialog).mockReset();
  });

  it("shows the cancel action for a parameterized input", () => {
    render(<InputStep step={step} />);

    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(openInputStepDialog).toHaveBeenCalledWith(
      "../input/input-id/",
      expect.objectContaining({ message: "Sign this?" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(fetchMock).toHaveBeenCalledWith("../input/input-id/abort", {
      method: "POST",
      headers: { "Jenkins-Crumb": "crumb" },
    });
  });
});
