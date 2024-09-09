import * as React from "react";
import { Result } from "../PipelineGraphModel";
import { getClassForResult } from "./StatusIcons";

// These were mostly taken from SVG and pre-translated
const questionMarkPath =
  "M-0.672,4.29 L0.753,4.29 L0.753,5.78 L-0.672,5.78 L-0.672,4.29 Z M-2.21,-3.94 " +
  "C-1.63,-4.57 -0.830,-4.88 0.187,-4.88 C1.13,-4.88 1.88,-4.61 2.45,-4.07 C3.01,-3.54 3.30,-2.85 3.30,-2.01 " +
  "C3.30,-1.51 3.19,-1.10 2.99,-0.782 C2.78,-0.467 2.36,-0.00346 1.73,0.608 C1.27,1.05 0.972,1.43 0.836,1.74 " +
  "C0.700,2.04 0.632,2.50 0.632,3.10 L-0.644,3.10 C-0.644,2.42 -0.562,1.87 -0.400,1.45 " +
  "C-0.238,1.03 0.118,0.553 0.668,0.0133 L1.24,-0.553 C1.41,-0.715 1.55,-0.885 1.66,-1.06 " +
  "C1.85,-1.37 1.94,-1.69 1.94,-2.03 C1.94,-2.50 1.80,-2.90 1.52,-3.25 C1.24,-3.59 0.782,-3.76 0.137,-3.76 " +
  "C-0.660,-3.76 -1.21,-3.47 -1.52,-2.87 C-1.69,-2.54 -1.79,-2.07 -1.81,-1.45 L-3.09,-1.45 " +
  "C-3.09,-2.48 -2.80,-3.31 -2.21,-3.94 L-2.21,-3.94 Z";

interface Props {
  result: Result;
  radius: number;
  outerStyle?: React.CSSProperties;
  centerX?: number;
  centerY?: number;
}

const imagesPath = document.head.dataset.imagesurl;

export class SvgStatus extends React.PureComponent<Props> {
  render() {
    const baseWrapperClasses = "build-status-icon__wrapper icon-md";
    const {
      result,
      radius = 12,
      centerX = -radius,
      centerY = -radius,
    } = this.props;
    const outerStyle = this.props.outerStyle;
    const diameter = radius * 2;
    const iconOuterClassName =
      result === Result.running ? "in-progress" : "static";
    const iconSuffix = result === Result.running ? "-anime" : "";
    const style = { width: diameter, height: diameter };
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <ellipse
          cx="256"
          cy="256"
          rx="210"
          ry="210"
          fill="none"
          stroke="var(--success-color)"
          stroke-linecap="round"
          stroke-miterlimit="10"
          stroke-width="36"
        />
        <path
          d="M336 189L224 323L176 269.4"
          fill="transparent"
          stroke="var(--success-color)"
          stroke-width="36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      // <g
      //   className={`${baseWrapperClasses} ${getClassForResult(
      //     result
      //   )}${iconSuffix}`}
      //   style={style}
      // >
      //   <g
      //     className="build-status-icon__outer"
      //     style={outerStyle ?? { transform: `translate(0, 0)` }}
      //   >
      //     <svg
      //       focusable="false"
      //       className="svg-icon "
      //       x={centerX}
      //       y={centerY}
      //       width={diameter}
      //       height={diameter}
      //     >
      //       <use
      //         className="svg-icon"
      //         style={{ transformOrigin: "50% 50%" }}
      //         href={`${imagesPath}/build-status/build-status-sprite.svg#build-status-${iconOuterClassName}`}
      //       />
      //     </svg>
      //   </g>
      //   {getGlyphFor(result, radius, style, centerX, centerY)}
      // </g>
    );
  }
}

/**
 Returns a glyph (as <g>) for specified result type. Centered at centerX,centerY, scaled for 24px icons.
 */
function getGlyphFor(
  result: Result,
  radius: number,
  style: React.CSSProperties,
  centerX?: number,
  centerY?: number,
) {
  // NB: If we start resizing these things, we'll need to use radius/12 to
  // generate a "scale" transform for the group
  const diameter = radius * 2;
  switch (result) {
    case Result.aborted:
      return (
        <svg
          x={centerX}
          y={centerY}
          width={diameter}
          height={diameter}
          focusable="false"
          className={`svg-icon icon-md`}
          style={{ ...style, ...{ width: diameter, height: diameter } }}
        >
          <use
            href={`${imagesPath}/build-status/build-status-sprite.svg#last-aborted`}
          />
        </svg>
      );
    case Result.paused:
      // "||"
      // 8px 9.3px
      return (
        <svg
          x={centerX}
          y={centerY}
          width={diameter}
          height={diameter}
          focusable="false"
          className={`svg-icon icon-md`}
          viewBox={`${-radius} ${-radius} ${"100%"} ${"100%"}`}
          style={{ ...style, ...{ width: diameter, height: diameter } }}
        >
          <polygon points="-4,-4.65 -4,4.65 -4,4.65 -1.5,4.65 -1.5,-4.65" />
          <polygon points="4,-4.65 1.5,-4.65 1.5,-4.65 1.5,4.65 4,4.65" />
        </svg>
      );
    case Result.unstable:
      // "!"
      return (
        <svg
          x={centerX}
          y={centerY}
          width={diameter}
          height={diameter}
          focusable="false"
          className={`svg-icon icon-md`}
          style={{ ...style, ...{ width: diameter, height: diameter } }}
        >
          <use
            href={`${imagesPath}/build-status/build-status-sprite.svg#last-unstable`}
          />
        </svg>
      );
    case Result.success:
      // check-mark
      return (
        <svg
          x={centerX}
          y={centerY}
          width={diameter}
          height={diameter}
          focusable="false"
          className={`svg-icon icon-md`}
          style={{ ...style, ...{ width: diameter, height: diameter } }}
        >
          <use
            href={`${imagesPath}/build-status/build-status-sprite.svg#last-successful`}
          />
        </svg>
      );
    case Result.failure:
      // "X"
      return (
        <svg
          x={centerX}
          y={centerY}
          width={diameter}
          height={diameter}
          focusable="false"
          className={`svg-icon icon-md`}
          style={{ ...style, ...{ width: diameter, height: diameter } }}
        >
          <use
            href={`${imagesPath}/build-status/build-status-sprite.svg#last-failed`}
          />
        </svg>
      );
    case Result.not_built:
    case Result.running:
      return (
        <svg
          x={centerX}
          y={centerY}
          width={diameter}
          height={diameter}
          focusable="false"
          className={`svg-icon icon-md`}
          style={{ ...style, ...{ width: diameter, height: diameter } }}
        >
          <use
            href={`${imagesPath}/build-status/build-status-sprite.svg#never-built`}
          />
        </svg>
      );
    case Result.skipped:
    case Result.queued:
      return null;
    case Result.unknown:
      break; // Continue on to the "unknown render"

    default:
      badResult(result); // Compile-time exhaustiveness check as well as runtime error logging, then continue to "unknown" icon
  }
  // "?" for Result.unknown or for bad input
  return (
    <svg
      className={`svg-icon icon-md`}
      x={centerX}
      y={centerY}
      width={diameter}
      height={diameter}
      viewBox={`${-radius} ${-radius} ${"100%"} ${"100%"}`}
      style={{ ...style, ...{ width: diameter, height: diameter } }}
    >
      <path d={questionMarkPath} />
    </svg>
  );
}

function badResult(x: never) {
  console.error("Unexpected Result value", x);
}
