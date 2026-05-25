import { CSSProperties, memo, MouseEvent, useContext } from "react";

import {
  I18NContext,
  LocalizedMessageKey,
} from "../../../../common/i18n/index.ts";
import { classNames } from "../../../../common/utils/classnames.ts";
import LiveTotal from "../../../../common/utils/live-total.tsx";
import {
  LayoutInfo,
  NodeLabelInfo,
  StageInfo,
} from "../PipelineGraphModel.tsx";
import { TooltipLabel } from "./convertLabelToTooltip.tsx";
import { nodeStrokeWidth } from "./StatusIcons.tsx";
import { TruncatingLabel } from "./TruncatingLabel.tsx";

function countLeafStages(stage: StageInfo): number {
  if (stage.children.length === 0) {
    return stage.collapsedChildCount ?? 1;
  }
  return stage.children.reduce((sum, child) => sum + countLeafStages(child), 0);
}

function getChildCount(stage: StageInfo | undefined): number {
  if (!stage) return 0;
  return stage.children.length > 0
    ? countLeafStages(stage)
    : (stage.collapsedChildCount ?? 0);
}

function CollapseBadge({
  stage,
  isCollapsed,
  onToggleCollapse,
}: {
  stage: StageInfo | undefined;
  isCollapsed?: boolean;
  onToggleCollapse?: (stageId: number) => void;
}) {
  const messages = useContext(I18NContext);
  const childCount = getChildCount(stage);
  if (childCount <= 0) return null;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleCollapse && stage) {
      onToggleCollapse(stage.id);
    }
  };

  return (
    <span
      className="PWGx-pipeline-collapse-badge"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={
        isCollapsed
          ? messages.format(LocalizedMessageKey.expandNestedStages)
          : messages.format(LocalizedMessageKey.collapseNestedStages)
      }
    >
      ({childCount})
      <svg
        className={classNames("PWGx-pipeline-collapse-chevron", {
          "PWGx-pipeline-collapse-chevron--expanded": !isCollapsed,
        })}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="48"
          d="M184 112l144 144-144 144"
        />
      </svg>
    </span>
  );
}

interface RenderBigLabelProps {
  details: NodeLabelInfo;
  layout: LayoutInfo;
  measuredHeight: number;
  isSelected: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (stageId: number) => void;
}

export const BigLabel = memo(BigLabelImpl);

function BigLabelImpl({
  details,
  layout,
  measuredHeight,
  isSelected,
  isCollapsed,
  onToggleCollapse,
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
  if (details.node.isPlaceholder) {
    classNames.push("pgv-graph-node--skeleton");
  }

  const childCount = getChildCount(details.stage);

  return (
    <div className={classNames.join(" ")} style={style} key={details.key}>
      {childCount > 0 ? (
        <div className="PWGx-pipeline-big-label-content">
          <TruncatingLabel>{details.text}</TruncatingLabel>
          <CollapseBadge
            stage={details.stage}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
          />
        </div>
      ) : (
        <TruncatingLabel>{details.text}</TruncatingLabel>
      )}
    </div>
  );
}

export const TimingsLabel = memo(TimingsLabelImpl);

function TimingsLabelImpl({
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
  const timingsLabelStyle: CSSProperties = {
    position: "absolute",
    width: labelWidth,
    maxHeight: labelHeight + "px",
    textAlign: "center",
    marginLeft: labelOffsetH,
    color: "var(--text-color-secondary)",
  };

  const x = details.x;
  const bottom = measuredHeight - details.y + labelOffsetV;

  // These are about layout more than appearance, so they're inline
  const style: CSSProperties = {
    ...timingsLabelStyle,
    bottom: bottom + "px",
    left: x + "px",
  };

  const classNames = ["PWGx-pipeline-big-label"];
  if (isSelected) {
    classNames.push("PWGx-pipeline-big-label--selected");
  }
  if (details.stage?.synthetic) {
    classNames.push("pgv-graph-node--synthetic");
  }
  if (details.stage?.skeleton) {
    classNames.push("pgv-graph-node--skeleton");
  }
  if (details.node.isPlaceholder) {
    classNames.push("pgv-graph-node--skeleton");
  }

  return (
    <div className={classNames.join(" ")} style={style} key={details.key}>
      <LiveTotal
        total={details.stage?.totalDurationMillis}
        start={details.stage?.startTimeMillis ?? Date.now()}
        paused={details.stage?.pauseLiveTotal}
      />
    </div>
  );
}

interface SmallLabelProps {
  details: NodeLabelInfo;
  layout: LayoutInfo;
  isSelected?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (stageId: number) => void;
}

export const SmallLabel = memo(SmallLabelImpl);

function SmallLabelImpl({
  details,
  layout,
  isSelected,
  isCollapsed,
  onToggleCollapse,
}: SmallLabelProps) {
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
    <div className={classNames.join(" ")} style={style} key={details.key}>
      <TruncatingLabel>{details.text}</TruncatingLabel>
      <CollapseBadge
        stage={details.stage}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </div>
  );
}

interface SequentialContainerLabelProps {
  details: NodeLabelInfo;
  layout: LayoutInfo;
  isCollapsed?: boolean;
  onToggleCollapse?: (stageId: number) => void;
}

export const SequentialContainerLabel = memo(SequentialContainerLabelImpl);

function SequentialContainerLabelImpl({
  details,
  layout,
  isCollapsed,
  onToggleCollapse,
}: SequentialContainerLabelProps) {
  const { nodeRadius } = layout;

  const seqContainerName = details.text;
  const y = details.y;
  const x = details.x - Math.floor(nodeRadius * 2); // Because label X is a "node center"-relative position

  const lineHeight = 1.35;

  const childCount = getChildCount(details.stage);

  const containerStyle: CSSProperties = {
    top: y,
    left: x,
    lineHeight,
    marginTop: `-${lineHeight / 2}em`,
    position: "absolute",
    maxWidth: layout.nodeSpacingH,
    background: "var(--card-background)",
    fontSize: "0.8125rem",
    fontWeight: "var(--font-bold-weight)",
    padding: "0 5px",
    whiteSpace: "nowrap",
    display: childCount > 0 ? "flex" : undefined,
    alignItems: childCount > 0 ? "baseline" : undefined,
    gap: childCount > 0 ? "2px" : undefined,
  };

  return (
    <TooltipLabel content={seqContainerName}>
      <div style={containerStyle} key={details.key}>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: childCount > 0 ? "0 1 auto" : undefined,
          }}
        >
          {seqContainerName}
        </span>
        <CollapseBadge
          stage={details.stage}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>
    </TooltipLabel>
  );
}
