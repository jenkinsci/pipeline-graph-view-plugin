import * as React from 'react';

import { nodeStrokeWidth } from './StatusIcons';
import { Result } from '../PipelineGraphModel';

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

function describeArcAsPath(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    const d = ['M', start.x, start.y, 'A', radius, radius, 0, arcSweep, 0, end.x, end.y].join(' ');

    return d;
}

interface Props {
    percentage: number;
    radius: number;
    result: string;
}

export class SvgSpinner extends React.Component<Props> {
    infiniteRotationRunning = false;
    infiniteRotateDegrees = 0;
    isEdgeOrIE = ('MSInputMethodContext' in window && 'documentMode' in document) || window.navigator.userAgent.indexOf('Edge') > -1;
    requestAnimationFrameId = 0; // Callback handle
    animatedElement?: SVGElement;

    componentWillMount() {
        this.infiniteRotationRunning = false;
        this.infiniteRotateDegrees = 0;
    }

    infiniteLoadingTimer = () => {
        this.infiniteRotateDegrees += 1.5;

        if (this.infiniteRotateDegrees >= 360) {
            this.infiniteRotateDegrees = 0;
        }

        this.animatedElement!.setAttribute('transform', `rotate(${this.infiniteRotateDegrees})`);
        this.requestAnimationFrameId = requestAnimationFrame(this.infiniteLoadingTimer);
    };

    componentWillUnmount() {
        cancelAnimationFrame(this.requestAnimationFrameId);
    }

    render() {
        const { result } = this.props;
        const radius = this.props.radius || 12;
        const insideRadius = radius - 0.5 * nodeStrokeWidth; // No "inside" stroking in SVG

        let percentage = this.props.percentage;
        const groupClasses = ['PWGx-progress-spinner', result];

        if (result === Result.queued) {
            percentage = 0;
        } else if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
            percentage = 0;
        } else if (percentage === 100) {
            groupClasses.push('pc-over-100');
            percentage = 0;
        } else if (percentage > 100) {
            groupClasses.push('spin');
            percentage = 25;

            if (!this.infiniteRotationRunning && this.isEdgeOrIE) {
                requestAnimationFrame(this.infiniteLoadingTimer);

                this.infiniteRotationRunning = true;
            }
        }

        const rotate = (percentage / 100) * 360;
        const d = describeArcAsPath(0, 0, insideRadius, 0, rotate);

        const innerRadius = insideRadius / 3;

        return (
            <g className={groupClasses.join(' ')} ref={c => (this.animatedElement = c!)}>
                <circle cx="0" cy="0" r={radius} className="halo" strokeWidth={nodeStrokeWidth} />
                <circle cx="0" cy="0" r={insideRadius} className="statusColor" strokeWidth={nodeStrokeWidth} />
                <circle cx="0" cy="0" r={innerRadius} className="inner statusColor" />
                {percentage ? <path className={result} fill="none" strokeWidth={nodeStrokeWidth} d={d} /> : null}
            </g>
        );
    }
}
