import "./single-run.scss";

import { useContext, useMemo } from "react";

import StatusIcon from "../../../common/components/status-icon.tsx";
import {
  I18NContext,
  LocalizedMessageKey,
} from "../../../common/i18n/index.ts";
import useRunPoller from "../../../common/tree-api.ts";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";
import { time, Total } from "../../../common/utils/timings.tsx";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraph.tsx";
import {
  defaultLayout,
  LayoutInfo,
} from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { useCollapsedStages } from "../../../pipeline-graph-view/pipeline-graph/main/support/useCollapsedStages.ts";
import { RunInfo } from "./MultiPipelineGraphModel.ts";

export default function SingleRun({
  run,
  currentJobPath,
  normalizedParentJobPath,
}: SingleRunProps) {
  const currentRunPath = currentJobPath + run.id + "/";
  const { run: runInfo } = useRunPoller({ currentRunPath });

  function Changes() {
    const messages = useContext(I18NContext);

    if (run.changesCount === 0) {
      return;
    }
    return (
      <>
        {" - "}
        {messages.format(LocalizedMessageKey.changesSummary, {
          0: run.changesCount,
        })}
      </>
    );
  }

  const { showNames, showDurations } = useUserPreferences();

  const layout: LayoutInfo = useMemo(() => {
    const layout: LayoutInfo = {
      ...defaultLayout,
    };

    if (!showNames && !showDurations) {
      layout.nodeSpacingH = 45;
    } else {
      layout.nodeSpacingH = 90;
    }

    if (!showNames) {
      // Do not reserve space for big label.
      layout.ypStart -= layout.labelOffsetV + 16;
    }
    if (!showDurations) {
      // Do not reserve space for small label.
      layout.nodeSpacingV -= layout.labelOffsetV + 15;
    }

    return layout;
  }, [showDurations, showNames]);

  const { effectiveStages, collapsedStageIds, toggleCollapseStage } =
    useCollapsedStages(normalizedParentJobPath, runInfo.stages);

  return (
    <div className="pgv-single-run">
      <div>
        <a href={currentRunPath} className="pgv-user-specified-text">
          <StatusIcon status={run.result} />
          {run.displayName}
          <span>
            {time(run.timestamp)} - <Total ms={run.duration} />
            <Changes />
          </span>
        </a>
      </div>
      <PipelineGraph
        currentRunPath={currentRunPath}
        stages={effectiveStages}
        layout={layout}
        collapsed
        collapsedStageIds={collapsedStageIds}
        onToggleCollapse={toggleCollapseStage}
      />
    </div>
  );
}

interface SingleRunProps {
  run: RunInfo;
  currentJobPath: string;
  normalizedParentJobPath: string;
}
