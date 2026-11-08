package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.options.AriaRole;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import java.util.regex.Pattern;
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

    public void stageIsInView(String name) {
        log.info("Checking stage {} is in view in the graph", name);
        assertThat(getStageByName(name)).isInViewport(new LocatorAssertions.IsInViewportOptions().setRatio(1));
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

    public void respondToInputFromTooltip(String stage, String button) {
        log.info("Clicking {} for the input in stage {} from the graph tooltip", button, stage);
        Locator node = getStageByName(stage).locator("..");
        assertThat(node).hasClass(Pattern.compile("PWGx-pipeline-node--paused"));
        node.hover();

        Locator tooltip = graph.page().locator(".pgv-node-tooltip--input");
        assertThat(tooltip).isVisible();
        tooltip.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName(button))
                .click();
    }

    public void scroll(double deltaX, double deltaY) {
        log.info("Scrolling the graph by ({}, {})", deltaX, deltaY);
        graph.hover();
        graph.page().mouse().wheel(deltaX, deltaY);
    }

    public void hasTransform(String positionX, String scale) {
        log.info("Checking the graph is at x {} with scale {}", positionX, scale);
        assertThat(graph.locator("xpath=ancestor::*[contains(@class, 'react-transform-component')]"))
                .hasAttribute(
                        "style",
                        Pattern.compile("transform: translate\\(" + escapeRegex(positionX) + ", [^)]*\\) scale\\("
                                + escapeRegex(scale) + "\\);"));
    }

    // Playwright evaluates patterns as JavaScript regexes, which don't support Pattern.quote
    private static String escapeRegex(String value) {
        return value.replace(".", "\\.");
    }

    private Locator getStageByName(String name) {
        log.info("Getting stage by name {}", name);
        return getStages().getByRole(AriaRole.LINK, new Locator.GetByRoleOptions().setName(name));
    }

    private Locator getStages() {
        // exclude start/end terminals and the "+N hidden" counter node, which is a UI affordance rather than a stage
        return graph.locator(
                ".PWGx-pipeline-node:not(:has(.PWGx-pipeline-node-terminal)):not(:has(.PWGx-pipeline-node-counter))");
    }
}
