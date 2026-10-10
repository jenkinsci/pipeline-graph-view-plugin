import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactNode, useState } from "react";

import StoryControls from "../../common/components/story-controls.tsx";
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
  render: ({ width, ...props }) => (
    <Column width={width}>
      <RunSnippet {...props} />
    </Column>
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

const TIMELINE_STAGES = 20;
const TIMELINE_FAILED_STAGE = 3;
const TIMELINE_STAGE_DURATION = 60_000;

export const Timeline: Story = {
  render: () => <TimelineExample />,
};

/**
 * Lets the column's width and how far through the run it is be changed, to see how the snippet
 * fits and collapses its stages as they do.
 */
function TimelineExample() {
  const [width, setWidth] = useState(300);
  // How far through the run it is, in stages: the whole part is how many have finished, the next
  // one running, and the fraction how far through that one it is
  const [timeline, setTimeline] = useState(5.5);
  const passed = Math.floor(timeline);
  const fraction = timeline - passed;

  const progress =
    passed === TIMELINE_STAGES
      ? {
          complete: true,
          stages: states(Array(TIMELINE_STAGES).fill(Result.success)),
        }
      : inProgress(passed, TIMELINE_STAGES);
  // Once it's run, a stage fails and the run carries on, which takes priority over the running
  // stage when collapsing, so the running stage can end up collapsed
  const run = {
    ...progress,
    stages: progress.stages.map((stage, i) => {
      if (i === TIMELINE_FAILED_STAGE && i < passed) {
        return { ...stage, state: Result.failure };
      }
      // Progress is how long it's been running against how long it took last time
      if (i === passed) {
        return {
          ...stage,
          previousTotalDurationMillis: TIMELINE_STAGE_DURATION,
          startTimeMillis: Date.now() - fraction * TIMELINE_STAGE_DURATION,
        };
      }
      return stage;
    }),
  };

  return (
    <>
      <Column width={width}>
        <RunSnippet run={run} currentRunPath="#" />
      </Column>
      <StoryControls>
        <label htmlFor="timeline-width">Width</label>
        <input
          id="timeline-width"
          type="range"
          // The snippet's min-width, below which the history column hides it
          min={84}
          max={600}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
        <span>{width}px</span>
        <label htmlFor="timeline-progress">Timeline</label>
        <input
          id="timeline-progress"
          type="range"
          min={0}
          max={TIMELINE_STAGES}
          step={0.05}
          value={timeline}
          onChange={(e) => setTimeline(Number(e.target.value))}
        />
        <span>
          {passed === TIMELINE_STAGES
            ? "Complete"
            : `Stage ${passed + 1}, ${Math.round(fraction * 100)}%`}
        </span>
      </StoryControls>
    </>
  );
}

/**
 * Mirrors the build history column, which the snippet fills and fits its stages to. The outline
 * marks its bounds without taking up any of its width, unlike a border.
 */
function Column({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        outline: "1px dashed var(--jenkins-border-color)",
        outlineOffset: 6,
        borderRadius: 9,
      }}
    >
      <div className="pgv-run-snippet-host">{children}</div>
    </div>
  );
}

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
