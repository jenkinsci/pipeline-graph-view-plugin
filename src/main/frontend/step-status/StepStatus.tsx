import * as React from "react";
import { Result } from "../pipeline-graph-view/pipeline-graph/main";
import { decodeResultValue } from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel";
import { getSymbolForResult } from "../pipeline-graph-view/pipeline-graph/main/support/StatusIcons";

interface Props {
  status: Result;
  text: string;
  percent: number;
}

const Component = React.memo((props: Props) => {
  const icon = getSymbolForResult(decodeResultValue(props.status));
  return (
    <>
      <span className="task-icon-link">{icon}</span>
      <span className="task-link-text">{props.text}</span>
    </>
  );
});

export function getStepStatus(
  status: Result,
  complete?: number,
  radius?: number,
) {
  return getSymbolForResult(decodeResultValue(status));
}

export default Component;
