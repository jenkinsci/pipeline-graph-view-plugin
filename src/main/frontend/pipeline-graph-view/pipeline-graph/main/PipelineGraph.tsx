import * as React from 'react';

import { nodeStrokeWidth, getGroupForResult } from './support/StatusIcons';
import { TruncatingLabel } from './support/TruncatingLabel';
import startPollingPipelineStatus from './support/startPollingPipelineStatus';

import {
    CompositeConnection,
    decodeResultValue,
    defaultLayout,
    NodeLabelInfo,
    LayoutInfo,
    NodeColumn,
    NodeInfo,
    StageInfo,
    StageNodeInfo, Result,
} from './PipelineGraphModel';

import { layoutGraph, sequentialStagesLabelOffset } from './PipelineGraphLayout';

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

// Generate a react key for a connection
function connectorKey(leftNode: NodeInfo, rightNode: NodeInfo) {
    return 'c_' + leftNode.key + '_to_' + rightNode.key;
}

interface Props {
    stages: Array<StageInfo>;
    layout?: Partial<LayoutInfo>;
    onNodeClick?: (nodeName: string, id: number) => void;
    selectedStage?: StageInfo;
}

interface State {
    nodeColumns: Array<NodeColumn>;
    connections: Array<CompositeConnection>;
    bigLabels: Array<NodeLabelInfo>;
    smallLabels: Array<NodeLabelInfo>;
    branchLabels: Array<NodeLabelInfo>;
    measuredWidth: number;
    measuredHeight: number;
    layout: LayoutInfo;
    selectedStage?: StageInfo;
}

export class PipelineGraph extends React.Component {
    props!: Props;
    state: State;

    constructor(props: Props) {
        super(props);
        this.state = {
            nodeColumns: [],
            connections: [],
            bigLabels: [],
            smallLabels: [],
            branchLabels: [],
            measuredWidth: 0,
            measuredHeight: 0,
            layout: { ...defaultLayout, ...props.layout },
            selectedStage: props.selectedStage,
        };
    }
    

    componentDidMount() {
        const onPipelineDataReceived = (data: { stages: Array<StageInfo> }) => {
            const { stages } = data;
            this.setState({ stages });
            this.stagesUpdated(stages)
        };
        const onPollingError = (err: Error) => {
            console.log('There was an error when polling the pipeline status', err)
        };
        const onPipelineComplete = () => undefined

        startPollingPipelineStatus(
            onPipelineDataReceived,
            onPollingError,
            onPipelineComplete
        )
    }

    componentWillReceiveProps(nextProps: Props) {
        let newState: Partial<State> | undefined;
        let needsLayout = false;

        if (nextProps.layout != this.props.layout) {
            newState = { ...newState, layout: { ...defaultLayout, ...this.props.layout } };
            needsLayout = true;
        }

        if (nextProps.selectedStage !== this.props.selectedStage) {
            // If we're just changing selectedStage, we don't need to re-generate the children
            newState = { ...newState, selectedStage: nextProps.selectedStage };
        }

        if (nextProps.stages !== this.props.stages) {
            needsLayout = true;
        }

        const doLayoutIfNeeded = () => {
            if (needsLayout) {
                this.stagesUpdated(nextProps.stages);
            }
        };

        if (newState) {
            // If we need to update the state, then we'll delay any layout changes
            this.setState(newState, doLayoutIfNeeded);
        } else {
            doLayoutIfNeeded();
        }
    }

    /**
     * Main process for laying out the graph. Calls out to PipelineGraphLayout module.
     */
    private stagesUpdated(newStages: Array<StageInfo> = []) {
        this.setState(layoutGraph(newStages, this.state.layout));
    }

    /**
     * Generate the Component for a big label
     */
    private renderBigLabel(details: NodeLabelInfo) {
        const { nodeSpacingH, labelOffsetV, connectorStrokeWidth, ypStart } = this.state.layout;

        const labelWidth = nodeSpacingH - connectorStrokeWidth * 2;
        const labelHeight = ypStart - labelOffsetV;
        const labelOffsetH = Math.floor(labelWidth / -2);

        // These are about layout more than appearance, so they should probably remain inline
        const bigLabelStyle = {
            position: 'absolute',
            width: labelWidth,
            maxHeight: labelHeight + 'px',
            textAlign: 'center',
            marginLeft: labelOffsetH,
        };

        const x = details.x;
        const bottom = this.state.measuredHeight - details.y + labelOffsetV;

        // These are about layout more than appearance, so they're inline
        const style = {
            ...bigLabelStyle,
            bottom: bottom + 'px',
            left: x + 'px',
        };

        const classNames = ['PWGx-pipeline-big-label'];
        if (this.stageIsSelected(details.stage) || this.stageChildIsSelected(details.stage)) {
            classNames.push('selected');
        }

        return (
            <TruncatingLabel className={classNames.join(' ')} style={style} key={details.key}>
                {details.text}
            </TruncatingLabel>
        );
    }

    /**
     * Generate the Component for a small label
     */
    private renderSmallLabel(details: NodeLabelInfo) {
        const { nodeSpacingH, nodeSpacingV, curveRadius, connectorStrokeWidth, nodeRadius, smallLabelOffsetV } = this.state.layout;

        const smallLabelWidth = Math.floor(nodeSpacingH - 2 * curveRadius - 2 * connectorStrokeWidth); // Fit between lines
        const smallLabelHeight = Math.floor(nodeSpacingV - smallLabelOffsetV - nodeRadius - nodeStrokeWidth);
        const smallLabelOffsetH = Math.floor(smallLabelWidth * -0.5);

        const x = details.x + smallLabelOffsetH;
        const top = details.y + smallLabelOffsetV;

        // These are about layout more than appearance, so they're inline
        const style = {
            top: top,
            left: x,
            position: 'absolute',
            width: smallLabelWidth,
            maxHeight: smallLabelHeight,
            textAlign: 'center',
        };

        const classNames = ['PWGx-pipeline-small-label'];
        if (details.stage && this.stageIsSelected(details.stage)) {
            classNames.push('selected');
        }

        return (
            <TruncatingLabel className={classNames.join(' ')} style={style} key={details.key}>
                {details.text}
            </TruncatingLabel>
        );
    }

    /**
     * Generate the Component for a small label denoting the name of the container of a group of sequential parallel stages
     */
    private renderSequentialContainerLabel(details: NodeLabelInfo): React.ReactChild {
        const { nodeRadius } = this.state.layout;

        const seqContainerName = details.text;
        const y = details.y;
        const x = details.x - Math.floor(nodeRadius * 2); // Because label X is a "node center"-relative position

        const containerStyle: any = {
            top: y,
            left: x,
            marginTop: '-0.5em',
            position: 'absolute',
            maxWidth: sequentialStagesLabelOffset,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: 'white',
            padding: '0 7px',
            lineHeight: '1',
            whiteSpace: 'nowrap',
        };

        return (
            <div style={containerStyle} key={details.key} title={seqContainerName}>
                {seqContainerName}
            </div>
        );
    }

    /**
     * Generate SVG for a composite connection, which may be to/from many nodes.
     *
     * Farms work out to other methods on self depending on the complexity of the line required. Adds all the SVG
     * components to the elements list.
     */
    private renderCompositeConnection(connection: CompositeConnection, svgElements: SVGChildren) {
        const { sourceNodes, destinationNodes, skippedNodes, hasBranchLabels } = connection;

        if (skippedNodes.length === 0) {
            // Nothing too complicated, use the original connection drawing code
            this.renderBasicConnections(sourceNodes, destinationNodes, svgElements, hasBranchLabels);
        } else {
            this.renderSkippingConnections(sourceNodes, destinationNodes, skippedNodes, svgElements, hasBranchLabels);
        }
    }

    /**
     * Connections between adjacent columns without any skipping.
     *
     * Adds all the SVG components to the elements list.
     */
    private renderBasicConnections(sourceNodes: Array<NodeInfo>, destinationNodes: Array<NodeInfo>, svgElements: SVGChildren, hasBranchLabels: boolean) {
        const { connectorStrokeWidth, nodeSpacingH } = this.state.layout;
        const halfSpacingH = nodeSpacingH / 2;

        // Stroke props common to straight / curved connections
        const connectorStroke = {
            className: 'PWGx-pipeline-connector',
            strokeWidth: connectorStrokeWidth,
        };

        this.renderHorizontalConnection(sourceNodes[0], destinationNodes[0], connectorStroke, svgElements);

        if (sourceNodes.length === 1 && destinationNodes.length === 1) {
            return; // No curves needed.
        }

        // Work out the extents of source and dest space
        let rightmostSource = sourceNodes[0].x;
        let leftmostDestination = destinationNodes[0].x;

        for (let i = 1; i < sourceNodes.length; i++) {
            rightmostSource = Math.max(rightmostSource, sourceNodes[i].x);
        }

        for (let i = 1; i < destinationNodes.length; i++) {
            leftmostDestination = Math.min(leftmostDestination, destinationNodes[i].x);
        }

        // Collapse from previous node(s) to top column node
        const collapseMidPointX = Math.round(rightmostSource + halfSpacingH);
        for (const previousNode of sourceNodes.slice(1)) {
            this.renderBasicCurvedConnection(previousNode, destinationNodes[0], collapseMidPointX, svgElements);
        }

        // Expand from top previous node to column node(s)
        let expandMidPointX = Math.round(leftmostDestination - halfSpacingH);

        if (hasBranchLabels) {
            // Shift curve midpoint so that there's room for the labels
            expandMidPointX -= sequentialStagesLabelOffset;
        }

        for (const destNode of destinationNodes.slice(1)) {
            this.renderBasicCurvedConnection(sourceNodes[0], destNode, expandMidPointX, svgElements);
        }
    }

    /**
     * Renders a more complex connection, that "skips" one or more nodes
     *
     * Adds all the SVG components to the elements list.
     */
    private renderSkippingConnections(
        sourceNodes: Array<NodeInfo>,
        destinationNodes: Array<NodeInfo>,
        skippedNodes: Array<NodeInfo>,
        svgElements: SVGChildren,
        hasBranchLabels: boolean
    ) {
        const { connectorStrokeWidth, nodeRadius, terminalRadius, curveRadius, nodeSpacingV, nodeSpacingH } = this.state.layout;

        const halfSpacingH = nodeSpacingH / 2;

        // Stroke props common to straight / curved connections
        const connectorStroke = {
            className: 'PWGx-pipeline-connector',
            strokeWidth: connectorStrokeWidth,
        };

        const skipConnectorStroke = {
            className: 'PWGx-pipeline-connector-skipped',
            strokeWidth: connectorStrokeWidth,
        };

        const lastSkippedNode = skippedNodes[skippedNodes.length - 1];
        let leftNode, rightNode;

        //--------------------------------------------------------------------------
        //  Draw the "ghost" connections to/from/between skipped nodes

        leftNode = sourceNodes[0];
        for (rightNode of skippedNodes) {
            this.renderHorizontalConnection(leftNode, rightNode, skipConnectorStroke, svgElements);
            leftNode = rightNode;
        }
        this.renderHorizontalConnection(leftNode, destinationNodes[0], skipConnectorStroke, svgElements);

        //--------------------------------------------------------------------------
        //  Work out the extents of source and dest space

        let rightmostSource = sourceNodes[0].x;
        let leftmostDestination = destinationNodes[0].x;

        for (let i = 1; i < sourceNodes.length; i++) {
            rightmostSource = Math.max(rightmostSource, sourceNodes[i].x);
        }

        for (let i = 1; i < destinationNodes.length; i++) {
            leftmostDestination = Math.min(leftmostDestination, destinationNodes[i].x);
        }

        //--------------------------------------------------------------------------
        //  "Collapse" from the source node(s) down toward the first skipped

        leftNode = sourceNodes[0];
        rightNode = skippedNodes[0];

        for (leftNode of sourceNodes.slice(1)) {
            const midPointX = Math.round(rightmostSource + halfSpacingH);
            const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
            const key = connectorKey(leftNode, rightNode);

            const x1 = leftNode.x + leftNodeRadius - nodeStrokeWidth / 2;
            const y1 = leftNode.y;
            const x2 = midPointX;
            const y2 = rightNode.y;

            const pathData = `M ${x1} ${y1}` + this.svgBranchCurve(x1, y1, x2, y2, midPointX, curveRadius);

            svgElements.push(<path {...connectorStroke} key={key} d={pathData} fill="none" />);
        }

        //--------------------------------------------------------------------------
        //  "Expand" from the last skipped node toward the destination nodes

        leftNode = lastSkippedNode;

        let expandMidPointX = Math.round(leftmostDestination - halfSpacingH);

        if (hasBranchLabels) {
            // Shift curve midpoint so that there's room for the labels
            expandMidPointX -= sequentialStagesLabelOffset;
        }

        for (rightNode of destinationNodes.slice(1)) {
            const rightNodeRadius = rightNode.isPlaceholder ? terminalRadius : nodeRadius;
            const key = connectorKey(leftNode, rightNode);

            const x1 = expandMidPointX;
            const y1 = leftNode.y;
            const x2 = rightNode.x - rightNodeRadius + nodeStrokeWidth / 2;
            const y2 = rightNode.y;

            const pathData = `M ${x1} ${y1}` + this.svgBranchCurve(x1, y1, x2, y2, expandMidPointX, curveRadius);

            svgElements.push(<path {...connectorStroke} key={key} d={pathData} fill="none" />);
        }

        //--------------------------------------------------------------------------
        //  "Main" curve from top of source nodes, around skipped nodes, to top of dest nodes

        leftNode = sourceNodes[0];
        rightNode = destinationNodes[0];

        const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
        const rightNodeRadius = rightNode.isPlaceholder ? terminalRadius : nodeRadius;
        const key = connectorKey(leftNode, rightNode);

        const skipHeight = nodeSpacingV * 0.5;
        const controlOffsetUpper = curveRadius * 1.54;
        const controlOffsetLower = skipHeight * 0.257;
        const controlOffsetMid = skipHeight * 0.2;
        const inflectiontOffset = Math.round(skipHeight * 0.7071); // cos(45º)-ish

        // Start point
        const p1x = leftNode.x + leftNodeRadius - nodeStrokeWidth / 2;
        const p1y = leftNode.y;

        // Begin curve down point
        const p2x = Math.round(skippedNodes[0].x - halfSpacingH);
        const p2y = p1y;
        const c1x = p2x + controlOffsetUpper;
        const c1y = p2y;

        // End curve down point
        const p4x = skippedNodes[0].x;
        const p4y = p1y + skipHeight;
        const c4x = p4x - controlOffsetLower;
        const c4y = p4y;

        // Curve down midpoint / inflection
        const p3x = skippedNodes[0].x - inflectiontOffset;
        const p3y = skippedNodes[0].y + inflectiontOffset;
        const c2x = p3x - controlOffsetMid;
        const c2y = p3y - controlOffsetMid;
        const c3x = p3x + controlOffsetMid;
        const c3y = p3y + controlOffsetMid;

        // Begin curve up point
        const p5x = lastSkippedNode.x;
        const p5y = p4y;
        const c5x = p5x + controlOffsetLower;
        const c5y = p5y;

        // End curve up point
        const p7x = Math.round(lastSkippedNode.x + halfSpacingH);
        const p7y = rightNode.y;
        const c8x = p7x - controlOffsetUpper;
        const c8y = p7y;

        // Curve up midpoint / inflection
        const p6x = lastSkippedNode.x + inflectiontOffset;
        const p6y = lastSkippedNode.y + inflectiontOffset;
        const c6x = p6x - controlOffsetMid;
        const c6y = p6y + controlOffsetMid;
        const c7x = p6x + controlOffsetMid;
        const c7y = p6y - controlOffsetMid;

        // End point
        const p8x = rightNode.x - rightNodeRadius + nodeStrokeWidth / 2;
        const p8y = rightNode.y;

        const pathData =
            `M ${p1x} ${p1y}` +
            `L ${p2x} ${p2y}` + // 1st horizontal
            `C ${c1x} ${c1y} ${c2x} ${c2y} ${p3x} ${p3y}` + // Curve down (upper)
            `C ${c3x} ${c3y} ${c4x} ${c4y} ${p4x} ${p4y}` + // Curve down (lower)
            `L ${p5x} ${p5y}` + // 2nd horizontal
            `C ${c5x} ${c5y} ${c6x} ${c6y} ${p6x} ${p6y}` + // Curve up (lower)
            `C ${c7x} ${c7y} ${c8x} ${c8y} ${p7x} ${p7y}` + // Curve up (upper)
            `L ${p8x} ${p8y}` + // Last horizontal
            '';

        svgElements.push(<path {...connectorStroke} key={key} d={pathData} fill="none" />);
    }

    /**
     * Simple straight connection.
     *
     * Adds all the SVG components to the elements list.
     */
    private renderHorizontalConnection(leftNode: NodeInfo, rightNode: NodeInfo, connectorStroke: Object, svgElements: SVGChildren) {
        const { nodeRadius, terminalRadius } = this.state.layout;
        const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
        const rightNodeRadius = rightNode.isPlaceholder ? terminalRadius : nodeRadius;

        const key = connectorKey(leftNode, rightNode);

        const x1 = leftNode.x + leftNodeRadius - nodeStrokeWidth / 2;
        const x2 = rightNode.x - rightNodeRadius + nodeStrokeWidth / 2;
        const y = leftNode.y;

        svgElements.push(<line {...connectorStroke} key={key} x1={x1} y1={y} x2={x2} y2={y} />);
    }

    /**
     * A direct curve between two nodes in adjacent columns.
     *
     * Adds all the SVG components to the elements list.
     */
    private renderBasicCurvedConnection(leftNode: NodeInfo, rightNode: NodeInfo, midPointX: number, svgElements: SVGChildren) {
        const { nodeRadius, terminalRadius, curveRadius, connectorStrokeWidth } = this.state.layout;
        const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
        const rightNodeRadius = rightNode.isPlaceholder ? terminalRadius : nodeRadius;

        const key = connectorKey(leftNode, rightNode);

        const leftPos = {
            x: leftNode.x + leftNodeRadius - nodeStrokeWidth / 2,
            y: leftNode.y,
        };

        const rightPos = {
            x: rightNode.x - rightNodeRadius + nodeStrokeWidth / 2,
            y: rightNode.y,
        };

        // Stroke props common to straight / curved connections
        const connectorStroke = {
            className: 'PWGx-pipeline-connector',
            strokeWidth: connectorStrokeWidth,
        };

        const pathData = `M ${leftPos.x} ${leftPos.y}` + this.svgBranchCurve(leftPos.x, leftPos.y, rightPos.x, rightPos.y, midPointX, curveRadius);

        svgElements.push(<path {...connectorStroke} key={key} d={pathData} fill="none" />);
    }

    /**
     * Generates an SVG path string for the "vertical" S curve used to connect nodes in adjacent columns.
     */
    private svgBranchCurve(x1: number, y1: number, x2: number, y2: number, midPointX: number, curveRadius: number) {
        const verticalDirection = Math.sign(y2 - y1); // 1 == curve down, -1 == curve up
        const w1 = midPointX - curveRadius - x1 + curveRadius * verticalDirection;
        const w2 = x2 - curveRadius - midPointX - curveRadius * verticalDirection;
        const v = y2 - y1 - 2 * curveRadius * verticalDirection; // Will be -ive if curve up
        const cv = verticalDirection * curveRadius;

        return (
            ` l ${w1} 0` + // first horizontal line
            ` c ${curveRadius} 0 ${curveRadius} ${cv} ${curveRadius} ${cv}` + // turn
            ` l 0 ${v}` + // vertical line
            ` c 0 ${cv} ${curveRadius} ${cv} ${curveRadius} ${cv}` + // turn again
            ` l ${w2} 0` // second horizontal line
        );
    }

    /**
     * Generate the SVG elements to represent a node.
     *
     * Adds all the SVG components to the elements list.
     */
    private renderNode(node: NodeInfo, svgElements: SVGChildren) {
        let nodeIsSelected = false;
        const { nodeRadius, connectorStrokeWidth, terminalRadius } = this.state.layout;
        const key = node.key;

        const groupChildren: SVGChildren = [];

        if (node.isPlaceholder) {
            groupChildren.push(<circle r={terminalRadius} className="PWGx-pipeline-node-terminal" />);
        } else {
            const { completePercent = 0, title, state } = node.stage;
            const resultClean = decodeResultValue(state);

            groupChildren.push(getGroupForResult(resultClean, completePercent, nodeRadius));

            if (title) {
                groupChildren.push(<title>{title}</title>);
            }

            nodeIsSelected = this.stageIsSelected(node.stage);
        }

        // Set click listener and link cursor only for nodes we want to be clickable
        const clickableProps: React.SVGProps<SVGCircleElement> = {};

        if (node.isPlaceholder === false && node.stage.state !== 'skipped') {
            clickableProps.cursor = 'pointer';
            clickableProps.onClick = () => this.nodeClicked(node);
        }

        // Add an invisible click/touch/mouseover target, coz the nodes are small and (more importantly)
        // many are hollow.
        groupChildren.push(
            <circle r={nodeRadius + 2 * connectorStrokeWidth} className="PWGx-pipeline-node-hittarget" fillOpacity="0" stroke="none" {...clickableProps} />
        );

        // Most of the nodes are in shared code, so they're rendered at 0,0. We transform with a <g> to position them
        const groupProps = {
            key,
            transform: `translate(${node.x},${node.y})`,
            className: nodeIsSelected ? 'PWGx-pipeline-node-selected' : 'PWGx-pipeline-node',
        };

        svgElements.push(React.createElement('g', groupProps, ...groupChildren));
    }

    /**
     * Generates SVG for visual highlight to show which node is selected.
     *
     * Adds all the SVG components to the elements list.
     */
    private renderSelectionHighlight(svgElements: SVGChildren) {
        const { nodeRadius, connectorStrokeWidth } = this.state.layout;
        const highlightRadius = Math.ceil(nodeRadius + 0.5 * connectorStrokeWidth + 1);
        let selectedNode: NodeInfo | undefined;

        columnLoop: for (const column of this.state.nodeColumns) {
            for (const row of column.rows) {
                for (const node of row) {
                    if (node.isPlaceholder === false && this.stageIsSelected(node.stage)) {
                        selectedNode = node;
                        break columnLoop;
                    }
                }
            }
        }

        if (selectedNode) {
            const transform = `translate(${selectedNode.x} ${selectedNode.y})`;

            svgElements.push(
                <g className="PWGx-pipeline-selection-highlight" transform={transform} key="selection-highlight">
                    <circle r={highlightRadius} strokeWidth={connectorStrokeWidth} />
                </g>
            );
        }
    }

    /**
     * Is this stage currently selected?
     */
    private stageIsSelected(stage?: StageInfo): boolean {
        const { selectedStage } = this.state;
        return (selectedStage && stage && selectedStage.id === stage.id) || false;
    }

    /**
     * Is this any child of this stage currently selected?
     */
    private stageChildIsSelected(stage?: StageInfo) {
        if (stage) {
            const { children } = stage;
            const { selectedStage } = this.state;

            if (children && selectedStage) {
                for (const childStage of children) {
                    let currentStage: StageInfo | undefined = childStage;

                    while (currentStage) {
                        if (currentStage.id === selectedStage.id) {
                            return true;
                        }
                        currentStage = currentStage.nextSibling;
                    }
                }
            }
        }

        return false;
    }

    private nodeClicked(node: NodeInfo) {
        if (node.isPlaceholder === false && node.stage.state !== 'skipped') {
            const stage = node.stage;
            const listener = this.props.onNodeClick;

            if (listener) {
                listener(stage.name, stage.id);
            }

            // Update selection
            this.setState({ selectedStage: stage });
        }
    }

    render() {
        const { nodeColumns, connections, bigLabels, smallLabels, branchLabels, measuredWidth, measuredHeight } = this.state;

        // Without these we get fire, so they're hardcoded
        const outerDivStyle = {
            position: 'relative', // So we can put the labels where we need them
            overflow: 'visible', // So long labels can escape this component in layout
        };

        const svgElements: SVGChildren = []; // Buffer for children of the SVG

        connections.forEach(connection => {
            this.renderCompositeConnection(connection, svgElements);
        });

        this.renderSelectionHighlight(svgElements);

        for (const column of nodeColumns) {
            for (const row of column.rows) {
                for (const node of row) {
                    this.renderNode(node, svgElements);
                }
            }
        }

        return (
            <div className="PWGx-PipelineGraph-container">
                <div style={outerDivStyle as any} className="PWGx-PipelineGraph">
                    <svg width={measuredWidth} height={measuredHeight}>
                        {svgElements}
                    </svg>
                    {bigLabels.map(label => this.renderBigLabel(label))}
                    {smallLabels.map(label => this.renderSmallLabel(label))}
                    {branchLabels.map(label => this.renderSequentialContainerLabel(label))}
                </div>
            </div>
        );
    }
}
