import "./pipeline-console.scss";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";

import Dropdown from "../../../common/components/dropdown.tsx";
import DropdownPortal from "../../../common/components/dropdown-portal.tsx";
import {
  CONSOLE,
  DOCUMENT,
  SETTINGS,
} from "../../../common/components/symbols.tsx";
import { useUserPermissions } from "../../../common/user/user-permission-provider.tsx";
import Skeleton from "./components/skeleton.tsx";
import Stages from "./components/stages.tsx";
import StagesCustomization from "./components/stages-customization.tsx";
import DataTreeView from "./DataTreeView.tsx";
import { useStepsPoller } from "./hooks/use-steps-poller.ts";
import { NoStageStepsFallback } from "./NoStageStepsFallback.tsx";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";
import ScrollToTopBottom from "./scroll-to-top-bottom.tsx";
import SplitView from "./split-view.tsx";
import StageView from "./StageView.tsx";

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
    fetchExceptionText,
    loading,
  } = useStepsPoller({ currentRunPath, previousRunPath });

  const showSplitView = loading || (!loading && stages.length > 0);

  const isOnlyPlaceholderNode = stages.length === 1 && stages[0].placeholder;

  const { canConfigure } = useUserPermissions();

  return (
    <>
      <DropdownPortal
        container={document.getElementById("console-pipeline-overflow-root")}
      >
        <Dropdown
          items={[
            showSplitView ? (
              <StagesCustomization key="visibility-select" />
            ) : (
              <></>
            ),
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
            canConfigure ? (
              {
                text: "Configure",
                icon: SETTINGS,
                href: `../../configure`,
              }
            ) : (
              <></>
            ),
          ]}
        />
      </DropdownPortal>

      {showSplitView && (
        <SplitView
          direction={stageViewPosition === "top" ? "vertical" : "horizontal"}
          storageKey="graph"
        >
          {!isOnlyPlaceholderNode &&
            (mainViewVisibility === "both" ||
              mainViewVisibility === "graphOnly") &&
            (loading ? (
              <Skeleton />
            ) : (
              <Stages
                stages={stages}
                selectedStage={openStage || undefined}
                stageViewPosition={stageViewPosition}
                onStageSelect={handleStageSelect}
              />
            ))}

          <SplitView storageKey="stages">
            {(mainViewVisibility === "both" ||
              mainViewVisibility === "stagesOnly") &&
              !isOnlyPlaceholderNode && (
                <div
                  key="tree-view"
                  id="tree-view-pane"
                  className="pgv-sticky-sidebar"
                >
                  {loading ? (
                    <div className={"pgv-skeleton-column"}>
                      <Skeleton height={2.625} />
                      <Skeleton height={20} />
                    </div>
                  ) : (
                    <DataTreeView
                      onNodeSelect={(_, nodeId) => handleStageSelect(nodeId)}
                      selected={openStage?.id}
                      stages={stages}
                    />
                  )}
                </div>
              )}

            <div key="stage-view" id="stage-view-pane">
              {loading ? (
                <div className={"pgv-skeleton-column"}>
                  <Skeleton height={2.625} />
                  <Skeleton height={20} />
                </div>
              ) : (
                <StageView
                  stage={openStage}
                  steps={openStageSteps}
                  stepBuffers={openStageStepBuffers}
                  expandedSteps={expandedSteps}
                  onStepToggle={onStepToggle}
                  onMoreConsoleClick={onMoreConsoleClick}
                  fetchExceptionText={fetchExceptionText}
                />
              )}
            </div>
          </SplitView>
        </SplitView>
      )}

      {!loading && stages.length === 0 && <NoStageStepsFallback />}

      <ScrollToTopBottom />
    </>
  );
}
