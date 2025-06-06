import "./stage-details.scss";

import Dropdown from "../../../common/components/dropdown.tsx";
import StatusIcon, {
  resultToColor,
} from "../../../common/components/status-icon.tsx";
import Tooltip from "../../../common/components/tooltip.tsx";
import {
  exact,
  Paused,
  Started,
  Total,
} from "../../../common/utils/timings.tsx";
import { StageInfo } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import StageNodeLink from "./StageNodeLink.tsx";
import { DOCUMENT } from "./symbols.tsx";

export default function StageDetails({ stage }: StageDetailsProps) {
  if (!stage) {
    return null;
  }

  return (
    <div
      className={
        "pgv-stage-details " + resultToColor(stage.state, stage.skeleton)
      }
    >
      {stage.state === "running" && (
        <div className={"pgv-stage-details__running"} />
      )}
      <div>
        <StatusIcon
          status={stage.state}
          skeleton={stage.skeleton}
          percentage={stage.completePercent}
        />
        <h2>{stage.name}</h2>
      </div>
      <ul>
        <li>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M112.91 128A191.85 191.85 0 0064 254c-1.18 106.35 85.65 193.8 192 194 106.2.2 192-85.83 192-192 0-104.54-83.55-189.61-187.5-192a4.36 4.36 0 00-4.5 4.37V152"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <path
              d="M233.38 278.63l-79-113a8.13 8.13 0 0111.32-11.32l113 79a32.5 32.5 0 01-37.25 53.26 33.21 33.21 0 01-8.07-7.94z"
              fill="currentColor"
            />
          </svg>
          <Total ms={stage.totalDurationMillis} />
        </li>
        <li>
          <Tooltip content={exact(stage.startTimeMillis)}>
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path
                  d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="32"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="32"
                  d="M256 128v144h96"
                />
              </svg>
              <Started since={stage.startTimeMillis} />
            </span>
          </Tooltip>
        </li>
        {stage.pauseDurationMillis !== 0 && (
          <li className={"jenkins-mobile-hide"}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path
                d="M145.61 464h220.78c19.8 0 35.55-16.29 33.42-35.06C386.06 308 304 310 304 256s83.11-51 95.8-172.94c2-18.78-13.61-35.06-33.41-35.06H145.61c-19.8 0-35.37 16.28-33.41 35.06C124.89 205 208 201 208 256s-82.06 52-95.8 172.94c-2.14 18.77 13.61 35.06 33.41 35.06z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
              />
              <path
                d="M343.3 432H169.13c-15.6 0-20-18-9.06-29.16C186.55 376 240 356.78 240 326V224c0-19.85-38-35-61.51-67.2-3.88-5.31-3.49-12.8 6.37-12.8h142.73c8.41 0 10.23 7.43 6.4 12.75C310.82 189 272 204.05 272 224v102c0 30.53 55.71 47 80.4 76.87 9.95 12.04 6.47 29.13-9.1 29.13z"
                fill="currentColor"
              />
            </svg>
            <Paused since={stage.pauseDurationMillis} />
          </li>
        )}
        <StageNodeLink agent={stage.agent} />
        <li>
          <Dropdown
            className={"jenkins-button--tertiary"}
            disabled={stage.synthetic && !stage.placeholder}
            items={[
              {
                text: "View stage as plain text",
                icon: DOCUMENT,
                href: `log?nodeId=${stage.id}`,
                target: "_blank",
              },
              {
                text: "Download stage logs",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path
                      d="M336 176h40a40 40 0 0140 40v208a40 40 0 01-40 40H136a40 40 0 01-40-40V216a40 40 0 0140-40h40"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="32"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="32"
                      d="M176 272l80 80 80-80M256 48v288"
                    />
                  </svg>
                ),
                href: `log?nodeId=${stage.id}`,
                download: `${stage.name}.txt`,
              },
            ]}
          />
        </li>
      </ul>
    </div>
  );
}

interface StageDetailsProps {
  stage: StageInfo | null;
}
