import React from "react";
import "./pipeline-console.scss";
import { useStepsPoller } from "./hooks/use-steps-poller.ts";
import { PipelineGraph } from "../../../pipeline-graph-view/pipeline-graph/main/index.ts";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";
import SplitView from "./split-view.tsx";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";
import VisibilitySelect from "./components/checkboxes.tsx";
import Dropdown from "../../../common/components/dropdown.tsx";
import { CONSOLE, DOCUMENT } from "./symbols.tsx";
import DropdownPortal from "../../../common/components/dropdown-portal.tsx";
import StageView from "./StageView.tsx";
import DataTreeView from "./DataTreeView.tsx";

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
            <VisibilitySelect key="visibility-select" />,
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
            <div className={"pgv-graph-view-thing__heading"}>Stage</div>
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
