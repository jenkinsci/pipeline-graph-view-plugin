package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.options.AriaRole;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class PipelineGraph {

    private static final Logger log = LoggerFactory.getLogger(PipelineGraph.class);
    private final Locator graph;

    public PipelineGraph(Locator graph) {
        this.graph = graph;
    }

    public void isVisible() {
        assertThat(graph).isVisible();
    }

    public void hasStages(int count, String... stageNames) {
        log.info("Checking that {} nodes are visible for the build", count);
        Locator stages = getStages();
        assertThat(stages).hasCount(count);

        if (count < stageNames.length) {
            throw new IllegalArgumentException(
                    "Number of stage names must be less than or equal to the number of stages");
        }

        for (int i = 0; i < stageNames.length; i++) {
            assertThat(stages.nth(i).getByRole(AriaRole.LINK)).hasText(stageNames[i]);
        }
    }

    public void stageIsSelected(String name) {
        log.info("Checking if stage {} is selected", name);
        assertThat(selectedStage().getByRole(AriaRole.LINK)).hasText(name);
    }

    public Locator selectedStage() {
        log.info("Getting the selected stage");
        return graph.locator(".PWGx-pipeline-node--selected");
    }

    public void selectStage(String name) {
        log.info("Selecting stage {} in the graph", name);
        getStageByName(name).click();
    }

    public void stageHasState(String stage, PipelineState state) {
        log.info("Checking if stage {} has state {}", stage, state);
        Locator stateSvg = getStageByName(stage).locator("..").getByRole(AriaRole.IMG);

        assertThat(stateSvg).hasAccessibleName(state.toString());
    }

    private Locator getStageByName(String name) {
        log.info("Getting stage by name {}", name);
        return getStages().getByRole(AriaRole.LINK, new Locator.GetByRoleOptions().setName(name));
    }

    private Locator getStages() {
        // select all those apart from the start and end nodes which are indicated by the PWGx-pipeline-node-terminal
        // class
        return graph.locator(".PWGx-pipeline-node:not(:has(.PWGx-pipeline-node-terminal))");
    }
}
