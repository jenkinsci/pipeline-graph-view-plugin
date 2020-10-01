import * as React from 'react';
import * as ReactDOM from 'react-dom';

//--------------------------------------
//  Safety constants
//--------------------------------------

const MINLENGTH = 5; // Minimum size of cut-down text
const MAXLOOPS = 50; // Max no of iterations attempting to find the correct size text

//--------------------------------------
//  Render lifecycle
//--------------------------------------

enum RenderState {
    INITIAL,
    MEASURE, // Mounted, text/props changed, measurement needed.
    FLUID, // Text too big, in the process of trimming it down
    STABLE, // Done measuring until props change
}

//--------------------------------------
//  Component
//--------------------------------------

interface Props {
    children?: string;
    style?: Object;
    className?: string;
}

/**
 * Multi-line label that will truncate with ellipses
 *
 * Use with a set width + height (or maxWidth / maxHeight) to get any use from it :D
 */
export class TruncatingLabel extends React.Component<Props> {
    //--------------------------------------
    //  Component state / lifecycle
    //--------------------------------------

    completeText = ''; // Unabridged plain text content
    innerText = ''; // Current innerText of element - includes possible ellipses
    renderState = RenderState.INITIAL; // Internal rendering lifecycle state
    checkSizeRequest?: number; // window.requestAnimationFrame handle

    //--------------------------------------
    //  Binary search state
    //--------------------------------------

    textCutoffLength = 0; // Last count used to truncate completeText
    longestGood = 0; // Length of the longest truncated text that fits
    shortestBad = 0; // Length of the shortest truncated text that does not fit
    loopCount = 0; // to avoid infinite iteration

    //--------------------------------------
    //  React Lifecycle
    //--------------------------------------

    componentWillMount() {
        this.handleProps(this.props);
    }

    componentWillReceiveProps(nextProps: Props) {
        this.handleProps(nextProps);
    }

    componentDidMount() {
        this.invalidateSize();
    }

    componentDidUpdate() {
        this.invalidateSize();
    }

    componentWillUnmount() {
        if (this.checkSizeRequest) {
            cancelAnimationFrame(this.checkSizeRequest);
            this.checkSizeRequest = 0;
        }
    }

    //--------------------------------------
    //  Render
    //--------------------------------------

    render() {
        const { className = '' } = this.props;

        const style: React.CSSProperties = this.props.style || {};

        const mergedStyle: React.CSSProperties = {
            overflow: 'hidden',
            wordWrap: 'break-word',
            ...style,
        };

        if (this.renderState !== RenderState.STABLE) {
            mergedStyle.opacity = 0;
        }

        return (
            <div style={mergedStyle} className={'TruncatingLabel ' + className} title={this.innerText}>
                {this.innerText}
            </div>
        );
    }

    //--------------------------------------
    //  Internal Rendering Lifecycle
    //--------------------------------------

    handleProps(props: Props) {
        const { children = '' } = props;

        if (typeof children === 'string') {
            this.completeText = children;
        } else if (children === null || children === false) {
            this.completeText = '';
        } else {
            console.warn('TruncatingLabel - Label children must be string but is', typeof children, children);
            this.completeText = 'Contents must be string';
        }

        this.renderState = RenderState.MEASURE;
        this.innerText = this.completeText;
        this.loopCount = 0;
        this.longestGood = MINLENGTH;
        this.shortestBad = this.innerText.length;
    }

    invalidateSize() {
        if (!this.checkSizeRequest) {
            this.checkSizeRequest = requestAnimationFrame(() => this.checkSize());
        }
    }

    checkSize() {
        this.checkSizeRequest = 0;

        if (this.renderState === RenderState.STABLE) {
            return; // Nothing to check, no more checks to schedule
        }

        const thisElement = ReactDOM.findDOMNode(this) as HTMLElement;
        const { scrollHeight, clientHeight, scrollWidth, clientWidth } = thisElement;

        const tooBig = scrollHeight > clientHeight || scrollWidth > clientWidth;

        if (this.renderState === RenderState.MEASURE) {
            // First measurement since mount / props changed

            if (tooBig) {
                this.renderState = RenderState.FLUID;

                // Set initial params for binary search of length
                this.longestGood = MINLENGTH;
                this.textCutoffLength = this.shortestBad = this.innerText.length;
            } else {
                this.renderState = RenderState.STABLE;
                this.forceUpdate(); // Re-render via react so it can update the alpha
            }
        }

        if (this.renderState === RenderState.FLUID) {
            this.loopCount++;

            const lastLength = this.textCutoffLength;

            let keepMeasuring;

            if (this.loopCount >= MAXLOOPS) {
                // This really shouldn't happen!
                console.error('TruncatingLabel - TOO MANY LOOPS');
                keepMeasuring = false;
            } else if (lastLength <= MINLENGTH) {
                keepMeasuring = false;
            } else if (Math.abs(this.shortestBad - this.longestGood) < 2) {
                // We're done searching, hoorays!
                keepMeasuring = false;
            } else {
                // Update search space
                if (tooBig) {
                    this.shortestBad = Math.min(this.shortestBad, lastLength);
                } else {
                    this.longestGood = Math.max(this.longestGood, lastLength);
                }

                // Calculate the next length and update the text
                this.textCutoffLength = Math.floor((this.longestGood + this.shortestBad) / 2);
                this.innerText = this.completeText.substr(0, this.textCutoffLength) + '…';

                // Bypass react's render loop during the "fluid" state for performance
                thisElement.innerText = this.innerText;
                keepMeasuring = true;
            }

            if (keepMeasuring) {
                this.invalidateSize();
            } else {
                this.renderState = RenderState.STABLE;
                this.forceUpdate(); // Re-render via react so it knows about updated alpha and final content
            }
        }
    }
}
