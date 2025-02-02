import { FunctionComponent } from "react";
import * as React from "react";
import { Result } from "../pipeline-graph-view/pipeline-graph/main";
import { decodeResultValue } from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
import { getSymbolForResult } from "../pipeline-graph-view/pipeline-graph/main/support/StatusIcons";

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
  const icon = getSymbolForResult(
    decodeResultValue(status),
    complete ?? 100,
    radius ?? 12,
    0,
    0,
    {},
  );
  return (
    <div
      className={`icon-sm`}
      style={{
        display: "inline-block",
        paddingBottom: "20px",
      }}
    >
      {icon}
    </div>
  );
}

export default Component;
