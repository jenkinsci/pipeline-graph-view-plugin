import { Component } from "react";

import { sequentialStagesLabelOffset } from "../PipelineGraphLayout.ts";
import {
  CompositeConnection,
  LayoutInfo,
  NodeInfo,
} from "../PipelineGraphModel.tsx";
import { nodeStrokeWidth } from "../support/StatusIcons.tsx";

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

// Generate a react key for a connection
function connectorKey(leftNode: NodeInfo, rightNode: NodeInfo) {
  return "c_" + leftNode.key + "_to_" + rightNode.key;
}

interface Props {
  connections: Array<CompositeConnection>;
  layout: LayoutInfo;
}

export class GraphConnections extends Component {
  declare props: Props;

  /**
   * Generate SVG for a composite connection, which may be to/from many nodes.
   *
   * Farms work out to other methods on self depending on the complexity of the line required. Adds all the SVG
   * components to the elements list.
   */
  private renderCompositeConnection(
    connection: CompositeConnection,
    svgElements: SVGChildren,
  ) {
    const { sourceNodes, destinationNodes, skippedNodes, hasBranchLabels } =
      connection;

    if (skippedNodes.length === 0) {
      // Nothing too complicated, use the original connection drawing code
      this.renderBasicConnections(
        sourceNodes,
        destinationNodes,
        svgElements,
        hasBranchLabels,
      );
    } else {
      this.renderSkippingConnections(
        sourceNodes,
        destinationNodes,
        skippedNodes,
        svgElements,
        hasBranchLabels,
      );
    }
  }

  /**
   * Connections between adjacent columns without any skipping.
   *
   * Adds all the SVG components to the elements list.
   */
  private renderBasicConnections(
    sourceNodes: Array<NodeInfo>,
    destinationNodes: Array<NodeInfo>,
    svgElements: SVGChildren,
    hasBranchLabels: boolean,
  ) {
    const { connectorStrokeWidth, nodeSpacingH } = this.props.layout;
    const halfSpacingH = nodeSpacingH / 2;

    // Stroke props common to straight / curved connections
    const connectorStroke = {
      className: "PWGx-pipeline-connector",
      strokeWidth: connectorStrokeWidth,
    };

    this.renderHorizontalConnection(
      sourceNodes[0],
      destinationNodes[0],
      connectorStroke,
      svgElements,
    );

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
      leftmostDestination = Math.min(
        leftmostDestination,
        destinationNodes[i].x,
      );
    }

    // Collapse from previous node(s) to top column node
    const collapseMidPointX = Math.round(rightmostSource + halfSpacingH);
    for (const previousNode of sourceNodes.slice(1)) {
      this.renderBasicCurvedConnection(
        previousNode,
        destinationNodes[0],
        collapseMidPointX,
        svgElements,
      );
    }

    // Expand from top previous node to column node(s)
    let expandMidPointX = Math.round(leftmostDestination - halfSpacingH);

    if (hasBranchLabels) {
      // Shift curve midpoint so that there's room for the labels
      expandMidPointX -= sequentialStagesLabelOffset;
    }

    for (const destNode of destinationNodes.slice(1)) {
      this.renderBasicCurvedConnection(
        sourceNodes[0],
        destNode,
        expandMidPointX,
        svgElements,
      );
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
    hasBranchLabels: boolean,
  ) {
    const {
      connectorStrokeWidth,
      nodeRadius,
      terminalRadius,
      curveRadius,
      nodeSpacingV,
      nodeSpacingH,
    } = this.props.layout;

    const halfSpacingH = nodeSpacingH / 2;

    // Stroke props common to straight / curved connections
    const connectorStroke = {
      className: "PWGx-pipeline-connector",
      strokeWidth: connectorStrokeWidth,
    };

    const skipConnectorStroke = {
      className: "PWGx-pipeline-connector-skipped",
      strokeWidth: connectorStrokeWidth,
    };

    const lastSkippedNode = skippedNodes[skippedNodes.length - 1];
    let leftNode, rightNode;

    //--------------------------------------------------------------------------
    //  Draw the "ghost" connections to/from/between skipped nodes

    leftNode = sourceNodes[0];
    for (rightNode of skippedNodes) {
      this.renderHorizontalConnection(
        leftNode,
        rightNode,
        skipConnectorStroke,
        svgElements,
      );
      leftNode = rightNode;
    }
    this.renderHorizontalConnection(
      leftNode,
      destinationNodes[0],
      skipConnectorStroke,
      svgElements,
    );

    //--------------------------------------------------------------------------
    //  Work out the extents of source and dest space

    let rightmostSource = sourceNodes[0].x;
    let leftmostDestination = destinationNodes[0].x;

    for (let i = 1; i < sourceNodes.length; i++) {
      rightmostSource = Math.max(rightmostSource, sourceNodes[i].x);
    }

    for (let i = 1; i < destinationNodes.length; i++) {
      leftmostDestination = Math.min(
        leftmostDestination,
        destinationNodes[i].x,
      );
    }

    //--------------------------------------------------------------------------
    //  "Collapse" from the source node(s) down toward the first skipped

    leftNode = sourceNodes[0];
    rightNode = skippedNodes[0];

    for (leftNode of sourceNodes.slice(1)) {
      const midPointX = Math.round(rightmostSource + halfSpacingH);
      const leftNodeRadius = leftNode.isPlaceholder
        ? terminalRadius
        : nodeRadius;
      const key = connectorKey(leftNode, rightNode);

      const x1 = leftNode.x + leftNodeRadius - nodeStrokeWidth / 2;
      const y1 = leftNode.y;
      const x2 = midPointX;
      const y2 = rightNode.y;

      const pathData =
        `M ${x1} ${y1}` +
        this.svgBranchCurve(x1, y1, x2, y2, midPointX, curveRadius);

      svgElements.push(
        <path {...connectorStroke} key={key} d={pathData} fill="none" />,
      );
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
      const rightNodeRadius = rightNode.isPlaceholder
        ? terminalRadius
        : nodeRadius;
      const key = connectorKey(leftNode, rightNode);

      const x1 = expandMidPointX;
      const y1 = leftNode.y;
      const x2 = rightNode.x - rightNodeRadius + nodeStrokeWidth / 2;
      const y2 = rightNode.y;

      const pathData =
        `M ${x1} ${y1}` +
        this.svgBranchCurve(x1, y1, x2, y2, expandMidPointX, curveRadius);

      svgElements.push(
        <path {...connectorStroke} key={key} d={pathData} fill="none" />,
      );
    }

    //--------------------------------------------------------------------------
    //  "Main" curve from top of source nodes, around skipped nodes, to top of dest nodes

    leftNode = sourceNodes[0];
    rightNode = destinationNodes[0];

    const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
    const rightNodeRadius = rightNode.isPlaceholder
      ? terminalRadius
      : nodeRadius;
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
      "";

    svgElements.push(
      <path {...connectorStroke} key={key} d={pathData} fill="none" />,
    );
  }

  /**
   * Simple straight connection.
   *
   * Adds all the SVG components to the elements list.
   */
  private renderHorizontalConnection(
    leftNode: NodeInfo,
    rightNode: NodeInfo,
    connectorStroke: Object,
    svgElements: SVGChildren,
  ) {
    const { nodeRadius, terminalRadius } = this.props.layout;
    const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
    const rightNodeRadius = rightNode.isPlaceholder
      ? terminalRadius
      : nodeRadius;

    const key = connectorKey(leftNode, rightNode);

    const x1 = leftNode.x + leftNodeRadius - nodeStrokeWidth / 2;
    const x2 = rightNode.x - rightNodeRadius + nodeStrokeWidth / 2;
    const y = leftNode.y;

    svgElements.push(
      <line {...connectorStroke} key={key} x1={x1} y1={y} x2={x2} y2={y} />,
    );
  }

  /**
   * A direct curve between two nodes in adjacent columns.
   *
   * Adds all the SVG components to the elements list.
   */
  private renderBasicCurvedConnection(
    leftNode: NodeInfo,
    rightNode: NodeInfo,
    midPointX: number,
    svgElements: SVGChildren,
  ) {
    const { nodeRadius, terminalRadius, curveRadius, connectorStrokeWidth } =
      this.props.layout;
    const leftNodeRadius = leftNode.isPlaceholder ? terminalRadius : nodeRadius;
    const rightNodeRadius = rightNode.isPlaceholder
      ? terminalRadius
      : nodeRadius;

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
      className: "PWGx-pipeline-connector",
      strokeWidth: connectorStrokeWidth,
    };

    const pathData =
      `M ${leftPos.x} ${leftPos.y}` +
      this.svgBranchCurve(
        leftPos.x,
        leftPos.y,
        rightPos.x,
        rightPos.y,
        midPointX,
        curveRadius,
      );

    svgElements.push(
      <path {...connectorStroke} key={key} d={pathData} fill="none" />,
    );
  }

  /**
   * Generates an SVG path string for the "vertical" S curve used to connect nodes in adjacent columns.
   */
  private svgBranchCurve(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    midPointX: number,
    curveRadius: number,
  ) {
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

  render() {
    const { connections } = this.props;

    const svgElements: SVGChildren = []; // Buffer for children of the SVG

    connections.forEach((connection) => {
      this.renderCompositeConnection(connection, svgElements);
    });

    return <>{svgElements}</>;
  }
}
