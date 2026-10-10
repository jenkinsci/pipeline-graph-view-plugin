import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactNode } from "react";

import { RunStages } from "./app.tsx";
import {
  Result,
  StageInfo,
} from "./pipeline-graph/main/PipelineGraphModel.tsx";

const meta: Meta<typeof RunStages> = {
  title: "Run stages card",
  component: RunStages,
  parameters: {
    controls: { disable: true },
  },
};

export default meta;

export const SimpleGraph: StoryObj<typeof RunStages> = {
  render: () => (
    <Card height={400}>
      <RunStages
        run={{
          complete: true,
          stages: [
            stage(1, "Checkout SCM", Result.success),
            stage(2, "Build", Result.success),
            stage(3, "Unit Tests", Result.failure),
            stage(4, "Warnings", Result.unstable),
            stage(5, "Post Actions", Result.success),
          ],
        }}
        loading={false}
        currentRunPath="#"
        normalizedParentJobPath="storybook-simple"
      />
    </Card>
  ),
};

export const ComplicatedGraph: StoryObj<typeof RunStages> = {
  render: () => (
    <Card>
      <RunStages
        run={{
          complete: false,
          stages: [
            stage(1, "Checkout SCM", Result.success),
            stage(2, "Lint", Result.unstable),
            stage(3, "Build", Result.failure, [
              branch(4, "Linux", Result.success, [
                stage(5, "Compile", Result.success),
                stage(6, "Package", Result.success),
              ]),
              branch(7, "macOS", Result.success, [
                stage(8, "Compile", Result.success),
                stage(9, "Package", Result.success),
              ]),
              branch(10, "Windows", Result.failure, [
                stage(11, "Compile", Result.failure),
                stage(12, "Package", Result.skipped),
              ]),
            ]),
            stage(13, "Test", Result.running, [
              branch(14, "Unit", Result.success),
              branch(15, "Integration", Result.running, [
                stage(16, "Database", Result.success),
                stage(17, "API", Result.running),
                stage(18, "UI", Result.not_built),
              ]),
            ]),
            stage(19, "Deploy", Result.not_built),
          ],
        }}
        loading={false}
        currentRunPath="#"
        normalizedParentJobPath="storybook-complicated"
      />
    </Card>
  ),
};

function Card({ height, children }: { height?: number; children: ReactNode }) {
  return (
    <div
      className="jenkins-card"
      id="graph"
      style={{ width: "min(1000px, 90vw)", height }}
    >
      {children}
    </div>
  );
}

function stage(
  id: number,
  name: string,
  state: Result,
  children: StageInfo[] = [],
): StageInfo {
  return {
    name,
    title: name,
    state,
    type: "STAGE",
    children,
    id,
    pauseDurationMillis: 0,
    startTimeMillis: Date.now() - 60_000,
    totalDurationMillis: state === Result.running ? undefined : 12_000,
    agent: "built-in",
    url: "",
  };
}

function branch(
  id: number,
  name: string,
  state: Result,
  children: StageInfo[] = [],
): StageInfo {
  return { ...stage(id, name, state, children), type: "PARALLEL" };
}
