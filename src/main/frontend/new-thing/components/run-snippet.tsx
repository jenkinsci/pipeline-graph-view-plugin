import "./run-snippet.scss";

import StatusIcon from "../../common/components/status-icon.tsx";
import Tooltip from "../../common/components/tooltip.tsx";
import { RunStatus } from "../../common/RestClient.tsx";
import LiveTotal from "../../common/utils/live-total.tsx";
import { collapseTopLevelStages } from "./utils.ts";

export default function RunSnippet({
  run,
  currentRunPath,
}: {
  run: RunStatus;
  currentRunPath: string;
}) {
  const items = collapseTopLevelStages(run.stages, 12);
  const total = run.stages.length;
  const started = run.stages.filter((stage) => !stage.skeleton).length;

  return (
    <div>
      <div className="pgv-run-snippet">
        {items.map((item) => {
          if (item.kind === "collapsed") {
            return (
              <Tooltip
                key={item.id}
                content={`${item.hiddenCount} hidden stage${item.hiddenCount === 1 ? "" : "s"}`}
              >
                <div className="pgv-run-snippet__collapsed">
                  {item.hiddenCount}
                </div>
              </Tooltip>
            );
          }

          const e = item.stage;

          // Placeholders come from the previous run, so there's no duration or stage to link to yet
          if (e.skeleton) {
            return (
              <Tooltip content={e.name} key={e.id}>
                <span>
                  <StatusIcon status={e.state} skeleton />
                </span>
              </Tooltip>
            );
          }

          return (
            <Tooltip
              content={
                <div style={{ textAlign: "center" }}>
                  <div>{e.name}</div>
                  <div className={"jenkins-!-text-color-secondary"}>
                    <LiveTotal
                      total={e.totalDurationMillis}
                      start={e.startTimeMillis}
                    />
                  </div>
                </div>
              }
              key={e.id}
            >
              <a href={currentRunPath + e.id}>
                <StatusIcon status={e.state} />
              </a>
            </Tooltip>
          );
        })}
      </div>
      <div
        className="jenkins-!-text-color-secondary"
        style={{ fontSize: "12px" }}
      >
        {started < total ? `${started} of ` : ""}
        {total} stage{total === 1 ? "" : "s"}
      </div>
    </div>
  );
}
