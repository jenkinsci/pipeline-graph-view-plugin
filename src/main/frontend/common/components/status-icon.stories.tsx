import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactNode, useState } from "react";

import { Result } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import StatusIcon from "./status-icon.tsx";
import StoryControls from "./story-controls.tsx";

const meta: Meta<typeof StatusIcon> = {
  title: "Status icon",
  component: StatusIcon,
  parameters: {
    controls: { disable: true },
  },
};

export default meta;

export const Progress: StoryObj<typeof StatusIcon> = {
  render: () => <ProgressExample />,
};

const ACTUAL_SIZE = "1.375rem";

function ProgressExample() {
  const [status, setStatus] = useState(Result.success);
  const [percentage, setPercentage] = useState(40);
  const [skeleton, setSkeleton] = useState(false);

  const inProgress = percentage > 0 && percentage < 100;

  const icon = (
    <StatusIcon
      status={inProgress ? Result.running : status}
      percentage={percentage}
      skeleton={skeleton}
    />
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "end", gap: "2rem" }}>
        <IconBox size="8rem">{icon}</IconBox>
        <IconBox size={ACTUAL_SIZE}>{icon}</IconBox>
      </div>
      <StoryControls>
        <label htmlFor="status-icon-status">Status</label>
        <select
          id="status-icon-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Result)}
          style={{ font: "inherit" }}
        >
          {Object.values(Result)
            .filter((result) => result !== Result.running)
            .map((result) => (
              <option key={result} value={result}>
                {result}
              </option>
            ))}
        </select>
        <span />
        <label htmlFor="status-icon-progress">Progress</label>
        <input
          id="status-icon-progress"
          type="range"
          min={0}
          max={100}
          value={percentage}
          onChange={(e) => setPercentage(Number(e.target.value))}
        />
        <span>
          {percentage}%{inProgress && ", running"}
        </span>
        <label htmlFor="status-icon-skeleton">Placeholder</label>
        <input
          id="status-icon-skeleton"
          type="checkbox"
          checked={skeleton}
          onChange={(e) => setSkeleton(e.target.checked)}
          style={{ justifySelf: "start" }}
        />
        <span />
      </StoryControls>
    </>
  );
}

function IconBox({ size, children }: { size: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        outline: "1px dashed var(--jenkins-border-color)",
      }}
    >
      {children}
    </div>
  );
}
