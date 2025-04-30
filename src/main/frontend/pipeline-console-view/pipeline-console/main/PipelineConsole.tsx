import "./pipeline-console.scss";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";

import React from "react";

import Dropdown from "../../../common/components/dropdown.tsx";
import DropdownPortal from "../../../common/components/dropdown-portal.tsx";
import StagesCustomization from "./components/stages-customization.tsx";
import Stages from "./components/stages.tsx";
import DataTreeView from "./DataTreeView.tsx";
import { useStepsPoller } from "./hooks/use-steps-poller.ts";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";
import SplitView from "./split-view.tsx";
import StageView from "./StageView.tsx";
import { CONSOLE, DOCUMENT } from "./symbols.tsx";
import ScrollToTopBottom from "./scroll-to-top-bottom.tsx";

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
            <StagesCustomization key="visibility-select" />,
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
        storageKey="graph"
      >
        {(mainViewVisibility === "both" ||
          mainViewVisibility === "graphOnly") && (
          <Stages
            stages={stages}
            selectedStage={openStage || undefined}
            stageViewPosition={stageViewPosition}
            onStageSelect={handleStageSelect}
          />
        )}

        <SplitView storageKey="stages">
          {(mainViewVisibility === "both" ||
            mainViewVisibility === "stagesOnly") && (
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

      <ScrollToTopBottom />
    </>
  );
}
