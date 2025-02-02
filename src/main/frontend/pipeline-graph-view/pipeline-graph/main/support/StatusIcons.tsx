import * as React from "react";
import { Result } from "../PipelineGraphModel";

export const nodeStrokeWidth = 3.5; // px.

function mapResultToCore(result: Result): string {
  switch (result) {
    case Result.success:
      return "blue";
    case Result.running:
      return "nobuilt-anime";
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
): React.ReactElement {
  // Handle non-core symbols
  if (result === Result.paused) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <ellipse
          cx="256"
          cy="256"
          rx="210"
          ry="210"
          fill="none"
          stroke="var(--text-color-secondary)"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="36"
        />
        <path
          fill="none"
          stroke="var(--text-color-secondary)"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="32"
          d="M208 192v128M304 192v128"
        />
      </svg>
    );
  }

  if (result === Result.unknown) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <ellipse
          cx="256"
          cy="256"
          rx="210"
          ry="210"
          fill="none"
          stroke="var(--text-color-secondary)"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="36"
        />
        <path
          d="M200 202.29s.84-17.5 19.57-32.57C230.68 160.77 244 158.18 256 158c10.93-.14 20.69 1.67 26.53 4.45 10 4.76 29.47 16.38 29.47 41.09 0 26-17 37.81-36.37 50.8S251 281.43 251 296"
          fill="none"
          stroke="var(--text-color-secondary)"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="28"
        />
        <circle cx="250" cy="348" r="20"
                fill="var(--text-color-secondary)" />
      </svg>
    );
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
  );
  const mappedResult = mapResultToCore(result);

  return (
    <div
      dangerouslySetInnerHTML={{
        // This fails in React tests without the Jelly context
        __html: symbols?.content?.querySelector("#" + mappedResult)?.outerHTML || `<div></div>`,
      }}
    />
  );
}
