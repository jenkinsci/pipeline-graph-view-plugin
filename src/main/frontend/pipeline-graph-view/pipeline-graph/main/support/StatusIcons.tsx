import * as React from "react";
import { Result } from "../PipelineGraphModel";

export const nodeStrokeWidth = 3.5; // px.

function mapResultToCore(result: Result): string {
  switch (result) {
    case Result.success:
      return "blue";
    case Result.failure:
      return "red";
    case Result.unstable:
      return "yellow";
    case Result.aborted:
      return "aborted";
    case Result.not_built:
      return "nobuilt";
    default:
      throw new Error(`Unhandled result: ${result}`);
  }
}

export function getSymbolForResult(
  result: Result,
  percentage: number,
  radius: number,
  centerX: number,
  centerY: number,
  outerStyle: React.CSSProperties,
): React.ReactElement {
  // Handle non-core symbols
  if (result === Result.paused || result === Result.unknown) {
    // TODO - fix this up
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <ellipse cx="256" cy="256" rx="210" ry="210" fill="none" stroke="var(--text-color-secondary)"
                 strokeLinecap="round" strokeMiterlimit="10" strokeWidth="36" />
      </svg>
    )
  }

  if (result === Result.running) {
    return <p>Running!</p>
  }

  if (result === Result.skipped) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <ellipse cx="256" cy="256" rx="210" ry="210" fill="none" stroke="var(--text-color-secondary)"
                 strokeLinecap="round" strokeMiterlimit="10" strokeWidth="36" />
      </svg>
    )
  }

  // Map the result to retrieve the appropriate symbol from core
  const symbols = document.querySelector<HTMLTemplateElement>(
    "#pgv-build-status-icons",
  )!;
  const mappedResult = mapResultToCore(result);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: symbols.content.querySelector("#" + mappedResult)!.outerHTML,
      }}
    />
  );
}
