import { CSSProperties } from "react";

import { sequentialStagesLabelOffset } from "../PipelineGraphLayout.ts";
import { LayoutInfo, NodeLabelInfo } from "../PipelineGraphModel.tsx";
import { TooltipLabel } from "./convertLabelToTooltip.tsx";
import { nodeStrokeWidth } from "./StatusIcons.tsx";
import { TruncatingLabel } from "./TruncatingLabel.tsx";

interface RenderBigLabelProps {
  details: NodeLabelInfo;
  layout: LayoutInfo;
  measuredHeight: number;
  isSelected: boolean;
}

/**
 * Generate the Component for a big label
 */
export function BigLabel({
  details,
  layout,
  measuredHeight,
  isSelected,
}: RenderBigLabelProps) {
  const { nodeSpacingH, labelOffsetV, connectorStrokeWidth, ypStart } = layout;

  const labelWidth = nodeSpacingH - connectorStrokeWidth * 2;
  const labelHeight = ypStart - labelOffsetV;
  const labelOffsetH = Math.floor(labelWidth / -2);

  // These are about layout more than appearance, so they should probably remain inline
  const bigLabelStyle: CSSProperties = {
    position: "absolute",
    width: labelWidth,
    maxHeight: labelHeight + "px",
    textAlign: "center",
    marginLeft: labelOffsetH,
  };

  const x = details.x;
  const bottom = measuredHeight - details.y + labelOffsetV;

  // These are about layout more than appearance, so they're inline
  const style: CSSProperties = {
    ...bigLabelStyle,
    bottom: bottom + "px",
    left: x + "px",
  };

  const classNames = ["PWGx-pipeline-big-label"];
  if (isSelected) {
    classNames.push("PWGx-pipeline-big-label--selected");
  }
  if (details.stage && details.stage.synthetic) {
    classNames.push("pgv-graph-node--synthetic");
  }
  if (details.stage?.skeleton) {
    classNames.push("pgv-graph-node--skeleton");
  }
  if (details.node.id < 0) {
    classNames.push("pgv-graph-node--skeleton");
  }

  return (
    <TruncatingLabel
      className={classNames.join(" ")}
      style={style}
      key={details.key}
    >
      {details.text}
    </TruncatingLabel>
  );
}

interface SmallLabelProps {
  details: NodeLabelInfo;
  layout: LayoutInfo;
  isSelected?: boolean;
}

/**
 * Generate the Component for a small label
 */
export function SmallLabel({ details, layout, isSelected }: SmallLabelProps) {
  const {
    nodeSpacingH,
    nodeSpacingV,
    curveRadius,
    connectorStrokeWidth,
    nodeRadius,
    smallLabelOffsetV,
  } = layout;

  const smallLabelWidth = Math.floor(
    nodeSpacingH - 2 * curveRadius - 2 * connectorStrokeWidth,
  ); // Fit between lines
  const smallLabelHeight = Math.floor(
    nodeSpacingV - smallLabelOffsetV - nodeRadius - nodeStrokeWidth,
  );
  const smallLabelOffsetH = Math.floor(smallLabelWidth * -0.5);

  const x = details.x + smallLabelOffsetH;
  const top = details.y + smallLabelOffsetV;

  // These are about layout more than appearance, so they're inline
  const style: CSSProperties = {
    top,
    left: x,
    position: "absolute",
    width: smallLabelWidth,
    maxHeight: smallLabelHeight,
    textAlign: "center",
  };

  const classNames = ["PWGx-pipeline-small-label"];
  if (details.stage && isSelected) {
    classNames.push("PWGx-pipeline-small-label--selected");
  }

  return (
    <TruncatingLabel
      className={classNames.join(" ")}
      style={style}
      key={details.key}
    >
      {details.text}
    </TruncatingLabel>
  );
}

interface SequentialContainerLabelProps {
  details: NodeLabelInfo;
  layout: LayoutInfo;
}

/**
 * Generate the Component for a small label denoting the name of the container of a group of sequential parallel stages
 */
export function SequentialContainerLabel({
  details,
  layout,
}: SequentialContainerLabelProps) {
  const { nodeRadius } = layout;

  const seqContainerName = details.text;
  const y = details.y;
  const x = details.x - Math.floor(nodeRadius * 2); // Because label X is a "node center"-relative position

  const lineHeight = 1.35;

  const containerStyle = {
    top: y,
    left: x,
    lineHeight,
    marginTop: `-${lineHeight / 2}em`,
    position: "absolute" as const,
    maxWidth: sequentialStagesLabelOffset,
    overflow: "hidden",
    textOverflow: "ellipsis",
    background: "var(--card-background)",
    fontSize: "0.8125rem",
    fontWeight: "var(--font-bold-weight)",
    padding: "0 5px",
    whiteSpace: "nowrap" as const,
  };

  return (
    <TooltipLabel content={seqContainerName}>
      <div style={containerStyle} key={details.key}>
        {seqContainerName}
      </div>
    </TooltipLabel>
  );
}
