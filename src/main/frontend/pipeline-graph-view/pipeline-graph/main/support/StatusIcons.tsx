import * as React from "react";
import { Result } from "../PipelineGraphModel";
import { SvgStatus } from "./SvgStatus";

export const nodeStrokeWidth = 3.5; // px.

// Returns the correct <g> element for the result / progress percent.
export function getGroupForResult(
  result: Result,
  percentage: number,
  radius: number,
  centerX: number,
  centerY: number,
  outerStyle: React.CSSProperties
): React.ReactElement<SvgStatus> {
  switch (result) {
    case Result.running:
    case Result.queued:
    case Result.not_built:
    case Result.skipped:
    case Result.success:
    case Result.failure:
    case Result.paused:
    case Result.unstable:
    case Result.aborted:
    case Result.unknown:
      return (
        <SvgStatus
          radius={radius}
          result={result}
          outerStyle={outerStyle}
          centerX={centerX}
          centerY={centerY}
        />
      );
    default:
      badResult(result);
      return (
        <SvgStatus
          radius={radius}
          result={Result.unknown}
          outerStyle={outerStyle}
          centerX={centerX}
          centerY={centerY}
        />
      );
  }
}

function badResult(x: never) {
  console.error("Unexpected Result value", x);
}

export const getClassForResult = (result: Result) => {
  // These come from the themes icons.less
  switch (result) {
    case Result.aborted:
      return "icon-aborted";
    case Result.unstable:
      return "icon-yellow";
    case Result.failure:
      return "icon-red";
    case Result.success:
      return "icon-blue";
    case Result.running:
    case Result.queued:
      return "icon-grey";
    case Result.skipped:
      return "icon-skipped";
    case Result.not_built:
    case Result.paused:
    case Result.unknown:
    default:
      return "icon-nobuilt";
  }
};
