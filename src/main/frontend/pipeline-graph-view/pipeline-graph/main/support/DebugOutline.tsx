import { useCallback, useEffect, useRef, useState } from "react";

import Tooltip from "../../../../common/components/tooltip.tsx";
import { GraphNode, LayoutInfo } from "../PipelineGraphModel.tsx";

interface DebugOutlineProps {
  node: GraphNode;
  layout: LayoutInfo;
}

export function DebugOutline({ node, layout }: DebugOutlineProps) {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<number>(0);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  const hide = useCallback(() => {
    setVisible(false);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, 10_000);
  }, []);
  if (!visible) return null;
  return (
    <>
      <Tooltip content={`${node.id} (${node.name})`}>
        <rect
          x={node.x}
          y={node.y}
          width={node.width || 1}
          height={node.height}
          strokeWidth={2}
          stroke={"red"}
          fill="red"
          fillOpacity={0.1}
          onClick={hide}
        />
      </Tooltip>
      {node.shiftX > 0 && (
        <Tooltip content={`${node.id} (${node.name}) shiftX`}>
          <rect
            x={node.x + 2}
            y={node.y + 2}
            width={node.shiftX - 4}
            height={node.height - 4}
            strokeWidth={2}
            strokeDasharray={"5,5"}
            stroke={"blue"}
            fill="blue"
            fillOpacity={0.075}
            onClick={hide}
          />
        </Tooltip>
      )}
      {node.shiftY > 0 && (
        <Tooltip content={`${node.id} (${node.name}) shiftY`}>
          <rect
            x={node.x + 2}
            y={node.y - node.shiftY + 2}
            width={node.width - 4}
            height={node.shiftY - 4}
            strokeWidth={2}
            strokeDasharray={"3,3"}
            stroke={"green"}
            fill="green"
            fillOpacity={0.075}
            onClick={hide}
          />
        </Tooltip>
      )}
      <Tooltip content={`${node.id} (${node.name}) center`}>
        <rect
          x={node.x + node.width / 2 - layout.nodeSpacingH / 2}
          y={node.y - layout.nodeRadius - 8}
          width={1}
          height={layout.nodeRadius + 8}
          strokeWidth={2}
          strokeDasharray={"2,2"}
          stroke={"black"}
          fill="black"
          fillOpacity={0.075}
          onClick={hide}
        />
      </Tooltip>
    </>
  );
}
