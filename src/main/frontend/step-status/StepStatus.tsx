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
  const icon = getSymbolForResult(decodeResultValue(props.status));
  return (
    <>
      <span className="task-icon-link">
        {icon}
      </span>
      <span className="task-link-text">
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
  const icon = getSymbolForResult(decodeResultValue(status));
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
