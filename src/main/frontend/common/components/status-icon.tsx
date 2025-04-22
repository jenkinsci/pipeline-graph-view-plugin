import React from "react";
import "./status-icon.scss";
import { Result } from "../../pipeline-graph-view/pipeline-graph/main";
import { decodeResultValue } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";

/**
 * Visual representation of a job or build status
 */
export default function StatusIcon({
  status,
  percentage,
  skeleton,
}: StatusIconProps) {
  status = decodeResultValue(status);

  const viewBoxSize = 512;
  const strokeWidth = status === "running" ? 50 : 0;
  const radius = (viewBoxSize - strokeWidth) / 2.2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((percentage ?? 100) / 100) * circumference;

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={"pgv-status-icon " + resultToColor(status, skeleton)}
      opacity={skeleton ? 0.5 : 1}
    >
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={radius}
        fill="oklch(from var(--color) l c h / 0.15)"
        style={{
          transition: "var(--standard-transition)",
        }}
      />
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={radius - 10}
        fill="none"
        stroke="var(--color)"
        strokeWidth={20}
        strokeOpacity={0.15}
      />
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={radius}
        fill="none"
        stroke="var(--color)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "var(--standard-transition)",
        }}
      />

      <Group currentStatus={status} status={Result.running}>
        <circle
          cx="256"
          cy="256"
          r="40"
          fill="var(--color)"
          className={status === "running" ? "pgv-scale" : ""}
        />
      </Group>

      <Group currentStatus={status} status={Result.success}>
        <path
          d="M336 189L224 323L176 269.4"
          fill="transparent"
          stroke="var(--color)"
          strokeWidth={32}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Group>

      <Group currentStatus={status} status={Result.failure}>
        <path
          fill="none"
          stroke="var(--color)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={32}
          d="M320 320L192 192M192 320l128-128"
        />
      </Group>

      <Group currentStatus={status} status={Result.aborted}>
        <path
          fill="none"
          stroke="var(--color)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={32}
          d="M192 320l128-128"
        />
      </Group>

      <Group currentStatus={status} status={Result.unstable}>
        <path
          d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z"
          fill="none"
          stroke="var(--color)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={32}
        />
        <ellipse cx="256" cy="350" rx="26" ry="26" fill="var(--color)" />
      </Group>

      <Group currentStatus={status} status={Result.skipped}>
        <path
          d="M320 176a16 16 0 00-16 16v53l-111.68-67.44a10.78 10.78 0 00-16.32 9.31v138.26a10.78 10.78 0 0016.32 9.31L304 267v53a16 16 0 0032 0V192a16 16 0 00-16-16z"
          fill="var(--color)"
        />
      </Group>

      <Group currentStatus={status} status={Result.paused}>
        <path
          fill="none"
          stroke="var(--color)"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth={32}
          d="M208 192v128M304 192v128"
        />
      </Group>

      <Group currentStatus={status} status={Result.not_built}>
        <circle cx="256" cy="256" r="30" fill="var(--color)" />
        <circle cx="352" cy="256" r="30" fill="var(--color)" />
        <circle cx="160" cy="256" r="30" fill="var(--color)" />
      </Group>

      <Group currentStatus={status} status={Result.unknown}>
        <path
          d="M200 202.29s.84-17.5 19.57-32.57C230.68 160.77 244 158.18 256 158c10.93-.14 20.69 1.67 26.53 4.45 10 4.76 29.47 16.38 29.47 41.09 0 26-17 37.81-36.37 50.8S251 281.43 251 296"
          fill="none"
          stroke="var(--color)"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="28"
        />
        <circle cx="250" cy="348" r="20" fill="var(--color)" />
      </Group>
    </svg>
  );
}

function Group({
  currentStatus,
  status,
  children,
}: {
  currentStatus: Result;
  status: Result;
  children: React.ReactNode;
}) {
  return (
    <g
      style={{
        transform: currentStatus !== status ? "scale(0)" : "scale(1)",
        opacity: currentStatus !== status ? 0 : 1,
      }}
    >
      {children}
    </g>
  );
}

export function resultToColor(result: Result, skeleton: boolean | undefined) {
  if (skeleton) {
    return "jenkins-!-skipped-color";
  }

  switch (result) {
    case "success":
      return "jenkins-!-success-color";
    case "failure":
      return "jenkins-!-error-color";
    case "running":
      return "jenkins-!-accent-color";
    case "unstable":
      return "jenkins-!-warning-color";
    default:
      return "jenkins-!-skipped-color";
  }
}

interface StatusIconProps {
  status: Result;
  percentage?: number;
  skeleton?: boolean;
}
