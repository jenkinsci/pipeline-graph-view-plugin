package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineOverviewPage extends JenkinsPage<PipelineOverviewPage> {
    private static final Logger log = LoggerFactory.getLogger(PipelineOverviewPage.class);
    private final String buildName;
    private final PipelineGraph graph;
    private final OverviewTree tree;
    private final PipelineConsole logs;

    public PipelineOverviewPage(Page page, String jobUrl, String buildName) {
        super(page, jobUrl + "pipeline-overview/");
        this.buildName = buildName;
        graph = new PipelineGraph(page.locator(".PWGx-PipelineGraph-container"));
        tree = new OverviewTree(page.locator("#tree-view-pane"));
        logs = new PipelineConsole(page.locator("#stage-view-pane"));
    }

    @Override
    PipelineOverviewPage waitForLoaded() {
        super.waitForLoaded();

        Locator heading = page.getByRole(
                AriaRole.HEADING, new Page.GetByRoleOptions().setLevel(1).setName(buildName));
        assertThat(heading).isVisible();
        assertThat(page.locator("#console-pipeline-root")).isVisible();
        graph.isVisible();
        tree.isVisible();
        logs.isVisible();

        return this;
    }

    public PipelineOverviewPage hasStagesInGraph(int count, String... stages) {
        graph.hasStages(count, stages);
        return this;
    }

    public PipelineOverviewPage stageIsSelected(String stage) {
        return stageIsSelectedInGraph(stage).stageIsSelectedInTree(stage).stageIsSelectedInLogs(stage);
    }

    public PipelineOverviewPage stageIsSelectedInGraph(String stage) {
        graph.stageIsSelected(stage);
        return this;
    }

    public PipelineOverviewPage stageIsSelectedInTree(String stage) {
        tree.stageIsSelected(stage);
        return this;
    }

    public PipelineOverviewPage stageIsSelectedInLogs(String stage) {
        logs.stageIsSelected(stage);
        return this;
    }

    public PipelineOverviewPage selectStageInGraph(String stage) {
        graph.selectStage(stage);
        return this;
    }

    public PipelineOverviewPage selectStageInTree(String stage) {
        tree.selectStage(stage);
        return this;
    }

    public PipelineOverviewPage searchForStage(String stage) {
        tree.searchForStage(stage);
        return this;
    }

    public PipelineOverviewPage stepContainsText(String stepName, String textToFind) {
        logs.stepContainsText(stepName, textToFind);
        return this;
    }

    public PipelineOverviewPage stageHasSteps(String step, String... additional) {
        logs.stageHasSteps(step, additional);
        return this;
    }

    public PipelineOverviewPage stageHasState(String stage, PipelineState state) {
        return stageHasStateInGraph(stage, state)
                .stageHasStateInTree(stage, state)
                .stageHasStateInLogs(stage, state);
    }

    public PipelineOverviewPage stageHasStateInGraph(String stage, PipelineState state) {
        graph.stageHasState(stage, state);
        return this;
    }

    public PipelineOverviewPage stageHasStateInTree(String stage, PipelineState state) {
        tree.searchForStage(stage);
        tree.stageHasState(stage, state);
        return this;
    }

    public PipelineOverviewPage stageHasStateInLogs(String stage, PipelineState state) {
        // ensure that it is selected
        tree.searchForStage(stage);
        tree.selectStage(stage);
        logs.stageHasState(stage, state);
        return this;
    }

    public PipelineOverviewPage clearSearch() {
        tree.clearSearch();
        return this;
    }

    public PipelineOverviewPage filterBy(PipelineState filter) {
        tree.filterBy(filter);
        return this;
    }

    public PipelineOverviewPage resetFilter() {
        tree.resetFilter();
        return this;
    }

    public PipelineOverviewPage stageIsVisibleInTree(String stage) {
        tree.stageIsVisible(stage);
        return this;
    }
}
