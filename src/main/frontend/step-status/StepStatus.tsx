import { CSSProperties, FunctionComponent } from "react";
import * as React from "react";
import { Result } from "../pipeline-graph-view/pipeline-graph/main";
import { decodeResultValue } from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
import { getGroupForResult } from "../pipeline-graph-view/pipeline-graph/main/support/StatusIcons";
import { height } from "@mui/system";

interface Props {
  status: Result;
  text: string;
  percent: number;
  radius?: number;
}

const Component: FunctionComponent<Props> = (props: Props) => {
  const statusIcon = getStepStatus(props.status, props.percent, props.radius);
  return (
    <>
      {statusIcon}
      <span style={{ marginLeft: "0.3rem", padding: "auto" }}>
        {props.text}
      </span>
    </>
  );
};

export function getStepStatus(
  status: Result,
  complete?: number,
  radius?: number,
) {
  const icon = getGroupForResult(
    decodeResultValue(status),
    complete ?? 100,
    radius ?? 12,
    0,
    0,
    {},
  );
  const diameter = radius ? radius * 2 : 24;
  return (
    <div
      style={{
        display: "inline-block",
        paddingTop: "1px",
        verticalAlign: "middle",
        lineHeight: "normal",
      }}
    >
      <svg
        viewBox={`0 0 ${diameter} ${diameter}`}
        width={`${diameter}px`}
        height={`${diameter}px`}
      >
        {icon}
      </svg>
    </div>
  );
}

export default Component;
