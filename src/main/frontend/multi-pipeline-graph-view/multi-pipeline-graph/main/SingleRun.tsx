import "./single-run.scss";

import StatusIcon from "../../../common/components/status-icon.tsx";
import useRunPoller from "../../../common/tree-api.ts";
import { time, Total } from "../../../common/utils/timings.tsx";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraph.tsx";
import {
  defaultLayout,
  LayoutInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { RunInfo } from "./MultiPipelineGraphModel.ts";

export default function SingleRun({ run, currentJobPath }: SingleRunProps) {
  const { run: runInfo } = useRunPoller({
    currentRunPath: currentJobPath + run.id + "/",
  });

  const layout: LayoutInfo = {
    ...defaultLayout,
    nodeSpacingH: 45,
  };

  function Changes() {
    if (run.changes === 0) {
      return;
    }

    if (run.changes === 1) {
      return <> - 1 change</>;
    }

    return <> - {run.changes} changes</>;
  }

  return (
    <div className="pgv-single-run">
      <div>
        <a href={currentJobPath + run.id} className="pgw-user-specified-text">
          <StatusIcon status={run.result} />
          {run.displayName}
          <span>
            {time(run.timestamp)} - <Total ms={run.duration} />
            <Changes />
          </span>
        </a>
      </div>
      <PipelineGraph stages={runInfo?.stages || []} layout={layout} collapsed />
    </div>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
}
