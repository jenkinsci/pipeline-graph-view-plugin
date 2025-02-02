import * as React from "react";
import { Result } from "../PipelineGraphModel";
import { SvgStatus } from "./SvgStatus";

export const nodeStrokeWidth = 3.5; // px.

export function getSymbolForResult(
  result: Result,
  percentage: number,
  radius: number,
  centerX: number,
  centerY: number,
  outerStyle: React.CSSProperties,
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
        />
      );
    default:
      badResult(result);
      return (
        <SvgStatus
          radius={radius}
          result={Result.unknown}
        />
      );
  }
}

function badResult(x: never) {
  console.error("Unexpected Result value", x);
}
