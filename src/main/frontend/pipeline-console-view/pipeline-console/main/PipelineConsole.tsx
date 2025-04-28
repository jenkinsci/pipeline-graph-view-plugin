import React from "react";
import "./pipeline-console.scss";
import { useStepsPoller } from "./hooks/use-steps-poller";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";
import SplitView from "./split-view";
import { useLayoutPreferences } from "./providers/user-preference-provider";
import VisibilitySelect from "./components/checkboxes";
import Dropdown from "../../../common/components/dropdown";
import { CONSOLE, DOCUMENT } from "./symbols";
import DropdownPortal from "../../../common/components/dropdown-portal";
import StageView from "./StageView";
import DataTreeView from "./DataTreeView";

export default function PipelineConsole() {
  const rootElement = document.getElementById("console-pipeline-root");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;

  const { stageViewPosition, mainViewVisibility } = useLayoutPreferences();
  const {
    openStage,
    openStageSteps,
    openStageStepBuffers,
    expandedSteps,
    stages,
    handleStageSelect,
    onStepToggle,
    onMoreConsoleClick,
  } = useStepsPoller({ currentRunPath, previousRunPath });

  return (
    <>
      <DropdownPortal>
        <Dropdown
          items={[
            <VisibilitySelect />,
            "separator",
            {
              text: "View as plain text",
              icon: DOCUMENT,
              href: `../consoleText`,
            },
            {
              text: "View classic console",
              icon: CONSOLE,
              href: `../console`,
            },
          ]}
        />
      </DropdownPortal>

      <SplitView
        direction={stageViewPosition === "top" ? "vertical" : "horizontal"}
        storageKey="stage"
      >
        {(mainViewVisibility === "both" ||
          mainViewVisibility === "stageOnly") && (
          <div className={"pgv-graph-view-thing"}>
            <PipelineGraph
              stages={stages}
              onStageSelect={handleStageSelect}
            />
          </div>
        )}

        <SplitView storageKey="tree">
          {(mainViewVisibility === "both" ||
            mainViewVisibility === "treeOnly") && (
            <div
              key="tree-view"
              id="tree-view-pane"
              className="pgv-sticky-sidebar"
            >
              <DataTreeView
                onNodeSelect={(_, nodeId) => handleStageSelect(nodeId)}
                selected={openStage?.id}
                stages={stages}
              />
            </div>
          )}

          <div key="stage-view" id="stage-view-pane">
            <StageView
              stage={openStage}
              steps={openStageSteps}
              stepBuffers={openStageStepBuffers}
              expandedSteps={expandedSteps}
              onStepToggle={onStepToggle}
              onMoreConsoleClick={onMoreConsoleClick}
            />
          </div>
        </SplitView>
      </SplitView>
    </>
  );
}
