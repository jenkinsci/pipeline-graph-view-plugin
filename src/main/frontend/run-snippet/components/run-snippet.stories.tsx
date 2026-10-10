import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import RunSnippet from "./run-snippet.tsx";

type Args = Parameters<typeof RunSnippet>[0] & {
  /** Width of the build history column the snippet sits in, in px */
  width: number;
};

const meta: Meta<Args> = {
  title: "Run snippet",
  component: RunSnippet,
  parameters: {
    controls: { disable: true },
  },
  args: {
    currentRunPath: "#",
    width: 500,
  },
  // Mirrors the build history column, which the snippet fills and fits its stages to. The
  // outline marks its bounds without taking up any of its width, unlike a border.
  render: ({ width, ...props }) => (
    <div
      style={{
        display: "flex",
        width,
        outline: "1px dashed gray",
        outlineOffset: 6,
        borderRadius: 6,
      }}
    >
      <div className="pgv-run-snippet-host">
        <RunSnippet {...props} />
      </div>
    </div>
  ),
};

export default meta;

type Story = StoryObj<Args>;

export const Succeeded: Story = {
  args: {
    run: {
      complete: true,
      stages: states(Array(6).fill(Result.success)),
    },
  },
};

export const Failed: Story = {
  args: {
    run: {
      complete: true,
      stages: states([
        Result.success,
        Result.success,
        Result.failure,
        Result.skipped,
        Result.skipped,
      ]),
    },
  },
};

export const Unstable: Story = {
  args: {
    run: {
      complete: true,
      stages: states([
        Result.success,
        Result.unstable,
        Result.success,
        Result.success,
      ]),
    },
  },
};

export const InProgress: Story = {
  args: {
    run: inProgress(2, 8),
  },
};

export const InProgressCollapsed: Story = {
  args: {
    run: inProgress(9, 20),
    width: 200,
  },
};

// Only one stage is kept when collapsing, and an earlier failure takes priority
// over the running stage, so the running stage can end up collapsed
export const InProgressWithFailure: Story = {
  args: {
    run: {
      ...inProgress(9, 20),
      stages: inProgress(9, 20).stages.map((stage, i) =>
        i === 3 ? { ...stage, state: Result.failure } : stage,
      ),
    },
    width: 200,
  },
};

export const ManyStages: Story = {
  args: {
    run: {
      complete: true,
      stages: states([
        ...Array(8).fill(Result.success),
        Result.failure,
        ...Array(16).fill(Result.skipped),
      ]),
    },
  },
};

export const Narrow: Story = {
  args: {
    ...ManyStages.args,
    width: 120,
  },
};

/**
 * A run part way through, with `done` stages passed, the next one running, and the rest
 * placeholders from the previous run for the stages still to come.
 */
function inProgress(done: number, total: number) {
  return {
    complete: false,
    stages: states([
      ...Array(done).fill(Result.success),
      Result.running,
      ...Array(total - done - 1).fill(Result.not_built),
    ]).map((stage, i) => ({ ...stage, skeleton: i > done })),
  };
}

function states(results: Result[]): StageInfo[] {
  return results.map((state, id) => ({
    name: `Stage ${id + 1}`,
    title: `Stage ${id + 1}`,
    state,
    type: "STAGE",
    children: [],
    id,
    pauseDurationMillis: 0,
    startTimeMillis: Date.now() - (results.length - id) * 60_000,
    totalDurationMillis: state === Result.running ? undefined : 42_000,
    agent: "built-in",
    url: "",
  }));
}
