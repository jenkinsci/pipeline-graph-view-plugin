import * as React from 'react';

import { Result } from '../PipelineGraphModel';

import { nodeStrokeWidth } from './StatusIcons';

// These were mostly taken from SVG and pre-translated
const questionMarkPath =
    'M-0.672,4.29 L0.753,4.29 L0.753,5.78 L-0.672,5.78 L-0.672,4.29 Z M-2.21,-3.94 ' +
    'C-1.63,-4.57 -0.830,-4.88 0.187,-4.88 C1.13,-4.88 1.88,-4.61 2.45,-4.07 C3.01,-3.54 3.30,-2.85 3.30,-2.01 ' +
    'C3.30,-1.51 3.19,-1.10 2.99,-0.782 C2.78,-0.467 2.36,-0.00346 1.73,0.608 C1.27,1.05 0.972,1.43 0.836,1.74 ' +
    'C0.700,2.04 0.632,2.50 0.632,3.10 L-0.644,3.10 C-0.644,2.42 -0.562,1.87 -0.400,1.45 ' +
    'C-0.238,1.03 0.118,0.553 0.668,0.0133 L1.24,-0.553 C1.41,-0.715 1.55,-0.885 1.66,-1.06 ' +
    'C1.85,-1.37 1.94,-1.69 1.94,-2.03 C1.94,-2.50 1.80,-2.90 1.52,-3.25 C1.24,-3.59 0.782,-3.76 0.137,-3.76 ' +
    'C-0.660,-3.76 -1.21,-3.47 -1.52,-2.87 C-1.69,-2.54 -1.79,-2.07 -1.81,-1.45 L-3.09,-1.45 ' +
    'C-3.09,-2.48 -2.80,-3.31 -2.21,-3.94 L-2.21,-3.94 Z';

const hollowCirclePath = 'M 0,-6 A 6,6 0 0 1 0,6 A 6,6 0 0 1 0,-6 m 0,1.3 A 4,4 0 0 0 0,4.7 A 4,4 0 0 0 0,-4.7';

const checkMarkPoints = '-2.00 2.80 -4.80 0.00 -5.73 0.933 -2.00 4.67 6.00 -3.33 5.07 -4.27';

const crossPoints = '4.67 -3.73 3.73 -4.67 0 -0.94 -3.73 -4.67 -4.67 -3.73 -0.94 0 -4.67 3.73 -3.73 4.67 0 0.94 ' + '3.73 4.67 4.67 3.73 0.94 0';

interface Props {
    result: Result;
    radius: number;
}

export class SvgStatus extends React.PureComponent<Props> {
    render() {
        const { result, radius = 12 } = this.props;

        if (result === Result.not_built || result === Result.skipped) {
            // Basic grey circle

            const innerRadius = radius - 0.5 * nodeStrokeWidth; // No "inside" stroking in SVG

            return (
                <g>
                    <circle cx="0" cy="0" r={radius} className="halo" strokeWidth={nodeStrokeWidth} />
                    <circle cx="0" cy="0" r={innerRadius} strokeWidth={nodeStrokeWidth} className="PWGx-svgResultStatusOutline" />
                </g>
            );
        } else {
            // Otherwise solid-bg circle with a glyph on it

            return (
                <g className="PWGx-svgResultStatusSolid">
                    <circle cx="0" cy="0" r={radius} className="halo" strokeWidth={nodeStrokeWidth} />
                    <circle cx="0" cy="0" r={radius} className={`statusColor circle-bg ${result}`} />
                    {getGlyphFor(result)}
                </g>
            );
        }
    }
}

/**
    Returns a glyph (as <g>) for specified result type. Centered at 0,0, scaled for 24px icons.
 */
function getGlyphFor(result: Result) {
    // NB: If we start resizing these things, we'll need to use radius/12 to
    // generate a "scale" transform for the group

    switch (result) {
        case Result.aborted:
            return (
                <g className="PWGx-result-status-glyph">
                    <polygon points="-5 -1 5 -1 5 1 -5 1" />
                </g>
            );
        case Result.paused:
            // "||"
            // 8px 9.3px
            return (
                <g className="PWGx-result-status-glyph">
                    <polygon points="-4,-4.65 -4,4.65 -4,4.65 -1.5,4.65 -1.5,-4.65" />
                    <polygon points="4,-4.65 1.5,-4.65 1.5,-4.65 1.5,4.65 4,4.65" />
                </g>
            );
        case Result.unstable:
            // "!"
            return (
                <g className="PWGx-result-status-glyph">
                    <polygon points="-1 -5 1 -5 1 1 -1 1" />
                    <polygon points="-1 3 1 3 1 5 -1 5" />
                </g>
            );
        case Result.success:
            // check-mark
            return (
                <g className="PWGx-result-status-glyph">
                    <polygon points={checkMarkPoints} />
                </g>
            );
        case Result.failure:
            // "X"
            return (
                <g className="PWGx-result-status-glyph">
                    <polygon points={crossPoints} />
                </g>
            );
        case Result.not_built: // Handled directly by SvgStatus component above
        case Result.skipped: // Handled directly by SvgStatus component above
        case Result.queued: // Handled by spinner
        case Result.running: // Handled by spinner
        case Result.unknown:
            break; // Continue on to the "unknown render"

        default:
            badResult(result); // Compile-time exhaustiveness check as well as runtime error logging, then continue to "unknown" icon
    }
    // "?" for Result.unknown or for bad input
    return (
        <g className="PWGx-result-status-glyph">
            <path d={questionMarkPath} />
        </g>
    );
}

function badResult(x: never) {
    console.error('Unexpected Result value', x);
}
