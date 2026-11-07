import "./nodes.scss";

import { CSSProperties, memo, ReactElement } from "react";

import InputStepControls from "../../../../common/components/input-step-controls.tsx";
import {
  resultToColor,
  StageStatusIcon,
} from "../../../../common/components/status-icon.tsx";
import Tooltip from "../../../../common/components/tooltip.tsx";
import { useInputTooltip } from "../../../../common/components/use-input-tooltip.ts";
import { classNames } from "../../../../common/utils/classnames.ts";
import LiveTotal from "../../../../common/utils/live-total.tsx";
import {
  LayoutInfo,
  NodeInfo,
  Result,
  StageInfo,
} from "../PipelineGraphModel.tsx";

type SVGChildren = Array<any>; // Fixme: Maybe refine this? Not sure what should go here, we have working code I can't make typecheck

interface NodeProps {
  node: NodeInfo;
  collapsed?: boolean;
  /**
   * If provided stages won't navigate on click, instead calling onStageSelect with the selected stage
   */
  onStageSelect?: (nodeId: string) => void;
  isSelected: boolean;
  /**
   * Run URL including the root URL and a trailing slash, used to submit pending input
   */
  currentRunPath: string;
}

export const Node = memo(NodeImpl);

function NodeImpl({
  node,
  collapsed,
  onStageSelect,
  isSelected,
  currentRunPath,
}: NodeProps) {
  const key = node.key;
  const { tooltipProps: inputTooltipProps, hide: hideInputTooltip } =
    useInputTooltip();

  if (node.isPlaceholder) {
    if (node.type === "counter") {
      const tooltip = (
        <ol className="pgv-node__counter-tooltip">
          {node.stages.map((stage) => (
            <li key={stage.id}>
              <a
                className={"jenkins-button jenkins-button--tertiary"}
                href={document.head.dataset.rooturl + stage.url}
              >
                <StageStatusIcon stage={stage} />
                {stage.name}
                <span style={{ color: "var(--text-color-secondary)" }}>
                  <LiveTotal
                    total={stage.totalDurationMillis}
                    start={stage.startTimeMillis}
                    paused={stage.pauseLiveTotal}
                  />
                </span>
              </a>
            </li>
          ))}
        </ol>
      );

      return (
        <Tooltip content={tooltip} interactive appendTo={document.body}>
          <div
            key={key}
            style={{
              position: "absolute",
              top: node.y,
              left: node.x,
              translate: "-50% -50%",
            }}
            className={"PWGx-pipeline-node"}
          >
            <span className={"PWGx-pipeline-node-counter"}>
              {node.stages.length}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <div
        key={key}
        style={{
          position: "absolute",
          top: node.y,
          left: node.x,
          translate: "-50% -50%",
        }}
        className="PWGx-pipeline-node"
      >
        {node.type === "start" && node.url && (
          <a
            href={node.url}
            onClick={(e) => {
              if (onStageSelect) {
                e.preventDefault();
                history.replaceState({}, "", e.currentTarget.href);

                onStageSelect(String(node.id));
              }
            }}
          >
            <span className="jenkins-visually-hidden">{node.name}</span>
          </a>
        )}
        <span className={"PWGx-pipeline-node-terminal"} />
      </div>
    );
  }

  const groupChildren: SVGChildren = [];
  const { title, state, url } = node.stage ?? {};
  groupChildren.push(
    <StageStatusIcon key={`icon-${node.id}`} stage={node.stage} />,
  );

  const clickable = !node.isPlaceholder && !node.stage.skeleton;

  // Most of the nodes are in shared code, so they're rendered at 0,0. We transform with a <g> to position them
  const groupProps = {
    key,
    style: {
      position: "absolute",
      top: node.y,
      left: node.x,
      translate: "-50% -50%",
    } as CSSProperties,
    className: classNames(
      "PWGx-pipeline-node",
      "PWGx-pipeline-node--" + state,
      resultToColor(node.stage.state, node.stage.skeleton),
      {
        "PWGx-pipeline-node--selected": isSelected,
      },
    ),
  };

  const causeOfBlockage =
    node.stage.state === "queued" ? node.stage.causeOfBlockage : undefined;

  const pendingInput =
    node.stage.state === Result.paused && !node.stage.skeleton
      ? node.stage.inputStep
      : undefined;

  let tooltip: ReactElement;
  if (pendingInput) {
    tooltip = (
      <div className="pgv-node-tooltip pgv-node-tooltip--input">
        {collapsed && <div>{title}</div>}
        <div className="pgv-node-tooltip__input-message">
          {pendingInput.message}
        </div>
        <InputStepControls
          input={pendingInput}
          baseUrl={`${currentRunPath}input/${pendingInput.id}/`}
          className="pgv-node-tooltip__input-controls"
          onAction={hideInputTooltip}
        />
      </div>
    );
  } else if (collapsed) {
    tooltip = (
      <div className="pgv-node-tooltip">
        <div>{title}</div>
        <div>
          <LiveTotal
            total={node.stage.totalDurationMillis}
            start={node.stage.startTimeMillis}
            paused={node.stage.pauseLiveTotal}
          />
        </div>
        {causeOfBlockage && <div>{causeOfBlockage}</div>}
      </div>
    );
  } else {
    tooltip = (
      <div className="pgv-node-tooltip">
        <LiveTotal
          total={node.stage.totalDurationMillis}
          start={node.stage.startTimeMillis}
          paused={node.stage.pauseLiveTotal}
        />
        {causeOfBlockage && <div>{causeOfBlockage}</div>}
      </div>
    );
  }

  return (
    <Tooltip content={tooltip} {...(pendingInput && inputTooltipProps)}>
      <div {...groupProps}>
        {groupChildren}
        {clickable && (
          <a
            href={document.head.dataset.rooturl + url}
            onClick={(e) => {
              if (onStageSelect) {
                e.preventDefault();
                history.replaceState({}, "", e.currentTarget.href);

                onStageSelect(String(node.stage.id));
              }
            }}
          >
            <span className="jenkins-visually-hidden">{title}</span>
          </a>
        )}
      </div>
    </Tooltip>
  );
}

interface SelectionHighlightProps {
  layout: LayoutInfo;
  nodes: Array<NodeInfo>;
  isStageSelected: (stage: StageInfo) => boolean;
}

/**
 * Generates SVG for visual highlight to show which node is selected.
 */
export function SelectionHighlight({
  layout,
  nodes,
  isStageSelected,
}: SelectionHighlightProps) {
  const { nodeRadius, connectorStrokeWidth } = layout;
  const highlightRadius = Math.ceil(
    nodeRadius + 0.5 * connectorStrokeWidth + 1,
  );

  const selectedNode: NodeInfo | undefined = (() => {
    for (const node of nodes) {
      if (!node.isPlaceholder && isStageSelected(node.stage)) {
        return node;
      }
    }
    return undefined;
  })();

  if (!selectedNode) return null;

  const transform = `translate(${selectedNode.x} ${selectedNode.y})`;

  return (
    <g
      className="PWGx-pipeline-selection-highlight"
      transform={transform}
      key="selection-highlight"
    >
      <circle r={highlightRadius} strokeWidth={connectorStrokeWidth} />
    </g>
  );
}
