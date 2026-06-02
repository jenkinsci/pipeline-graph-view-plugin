import "./pipeline-console.scss";
import "../../../pipeline-graph-view/app.scss";
import "../../../pipeline-graph-view/pipeline-graph/styles/main.scss";

import { BuildFlow } from "../../../build-flow-view/build-flow/main/BuildFlow.tsx";
import Dropdown from "../../../common/components/dropdown.tsx";
import DropdownPortal from "../../../common/components/dropdown-portal.tsx";
import {
  CONSOLE,
  DOCUMENT,
  SETTINGS,
} from "../../../common/components/symbols.tsx";
import { useUserPermissions } from "../../../common/user/user-permission-provider.tsx";
import { Result } from "../../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import Skeleton from "./components/skeleton.tsx";
import Stages from "./components/stages.tsx";
import StagesCustomization from "./components/stages-customization.tsx";
import DataTreeView from "./DataTreeView.tsx";
import { useStepsPoller } from "./hooks/use-steps-poller.ts";
import { NoStageStepsFallback } from "./NoStageStepsFallback.tsx";
import { useLayoutPreferences } from "./providers/user-preference-provider.tsx";
import ScrollToTopBottom from "./scroll-to-top-bottom.tsx";
import SplitView from "./split-view.tsx";
import StageDetails from "./stage-details.tsx";
import StageView from "./StageView.tsx";

export default function PipelineConsole() {
  const rootElement = document.getElementById("console-pipeline-root");
  const currentRunPath = rootElement?.dataset.currentRunPath!;
  const previousRunPath = rootElement?.dataset.previousRunPath;
  const hasBuildFlow = rootElement?.dataset.hasBuildFlow === "true";
  const rootUrl = rootElement?.dataset.rootUrl || "";
  const buildUrl = rootElement?.dataset.buildUrl || "";

  const { stageViewPosition, mainViewVisibility, setBuildFlowHeight } =
    useLayoutPreferences();
  const {
    complete,
    tailLogs,
    scrollToTail,
    startTailingLogs,
    stopTailingLogs,
    openStage,
    openStageSteps,
    stepBuffers,
    expandedSteps,
    stages,
    handleStageSelect,
    onStepToggle,
    fetchLogText,
    fetchExceptionText,
    loading,
  } = useStepsPoller({ currentRunPath, previousRunPath });

  const isOnlyPlaceholderNode = stages.length === 1 && stages[0].placeholder;
  const onlyQueuedPlaceholder =
    isOnlyPlaceholderNode && stages[0].state === Result.queued;

  const showSplitView =
    loading || (!loading && stages.length > 0 && !onlyQueuedPlaceholder);

  const { canConfigure } = useUserPermissions();

  const showGraph =
    mainViewVisibility === "all" ||
    mainViewVisibility === "graphAndStages" ||
    mainViewVisibility === "graphOnly";
  const showStages =
    mainViewVisibility === "all" ||
    mainViewVisibility === "graphAndStages" ||
    mainViewVisibility === "stagesOnly";
  const showBuildFlowPane =
    hasBuildFlow && mainViewVisibility === "all" && !isOnlyPlaceholderNode;

  const stagesContent = (
    <SplitView storageKey="stages">
      {showStages && !isOnlyPlaceholderNode && (
        <div key="tree-view" id="tree-view-pane" className="pgv-sticky-sidebar">
          {loading ? (
            <div className={"pgv-skeleton-column"}>
              <Skeleton height={2.625} />
              <Skeleton height={20} />
            </div>
          ) : (
            <DataTreeView
              currentRunPath={currentRunPath}
              onNodeSelect={handleStageSelect}
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
            tailLogs={tailLogs}
            scrollToTail={scrollToTail}
            stopTailingLogs={stopTailingLogs}
            stage={openStage}
            steps={openStageSteps}
            stepBuffers={stepBuffers}
            expandedSteps={expandedSteps}
            onStepToggle={onStepToggle}
            fetchLogText={fetchLogText}
            fetchExceptionText={fetchExceptionText}
            currentRunPath={currentRunPath}
          />
        )}
      </div>
    </SplitView>
  );

  const graphContent = (
    <SplitView
      direction={stageViewPosition === "top" ? "vertical" : "horizontal"}
      storageKey="graph"
    >
      {!isOnlyPlaceholderNode &&
        showGraph &&
        (loading ? (
          <Skeleton />
        ) : (
          <Stages
            stages={stages}
            selectedStage={openStage || undefined}
            stageViewPosition={stageViewPosition}
            onStageSelect={handleStageSelect}
            currentRunPath={currentRunPath}
          />
        ))}

      {stagesContent}
    </SplitView>
  );

  return (
    <>
      <DropdownPortal
        container={document.getElementById("console-pipeline-overflow-root")}
      >
        <Dropdown
          className={
            rootElement?.closest(".app-build-content")
              ? "jenkins-details__button"
              : ""
          }
          icon={SETTINGS}
          items={[
            showSplitView ? (
              <StagesCustomization
                key="visibility-select"
                showBuildFlow={hasBuildFlow}
              />
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

      {hasBuildFlow &&
        showSplitView &&
        mainViewVisibility === "buildFlowOnly" && (
          <BuildFlow buildUrl={buildUrl} rootUrlOverride={rootUrl} />
        )}

      {showSplitView && mainViewVisibility !== "buildFlowOnly" && (
        <>
          {showBuildFlowPane ? (
            <SplitView
              direction="vertical"
              storageKey="buildFlow"
              collapsible
              collapseLabel="Build Flow"
            >
              <div className="pgv-build-flow-card">
                <BuildFlow
                  buildUrl={buildUrl}
                  rootUrlOverride={rootUrl}
                  onNaturalHeight={setBuildFlowHeight}
                />
              </div>

              {graphContent}
            </SplitView>
          ) : (
            graphContent
          )}
        </>
      )}

      {!loading && onlyQueuedPlaceholder && (
        <>
          <StageDetails stage={stages[0]} />
          <NoStageStepsFallback
            currentRunPath={currentRunPath}
            tailLogs={tailLogs}
            scrollToTail={scrollToTail}
          />
        </>
      )}

      {!loading && stages.length === 0 && (
        <NoStageStepsFallback
          currentRunPath={currentRunPath}
          tailLogs={tailLogs}
          scrollToTail={scrollToTail}
        />
      )}

      <ScrollToTopBottom
        complete={complete}
        loading={loading}
        tailLogs={tailLogs}
        startTailingLogs={startTailingLogs}
        stopTailingLogs={stopTailingLogs}
      />
    </>
  );
}
