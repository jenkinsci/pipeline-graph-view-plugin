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
  const status = getStepStatus(props.status, props.percent, props.radius);
  return (
    <>
      {status}
      <span style={{ marginLeft: "0.3rem", padding: "auto" }}>
        {props.text}
      </span>
    </>
  );
};

function getStepStatus(status: Result, complete?: number, radius?: number) {
  const icon = getGroupForResult(
    decodeResultValue(status),
    complete ?? 100,
    radius ?? 12,
    {}
  );
  return <span>{icon}</span>;
}

export default Component;
