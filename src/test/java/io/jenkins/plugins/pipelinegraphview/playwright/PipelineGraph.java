package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraph {

    private static final Logger log = LoggerFactory.getLogger(PipelineGraph.class);
    private final Locator graph;

    public PipelineGraph(Locator graph) {
        this.graph = graph;
    }

    public void hasStages(int count, String... names) {
        log.info("Checking that {} nodes are visible for the build", count);
        Locator stages = getStages();
        assertThat(stages).hasCount(count);

        if (count < names.length) {
            throw new IllegalArgumentException("Number of names must be less than or equal to the number of stages");
        }

        for (int i = 0; i < names.length; i++) {
            assertThat(stages.nth(i)).hasText(names[i]);
        }
    }

    public Locator selectedStage() {
        return graph.locator(".PWGx-pipeline-node--selected");
    }

    public void selectStage(String name) {
        getStages().filter(new Locator.FilterOptions().setHasText(name)).click();
    }

    private Locator getStages() {
        // select all those apart from the start and end nodes which are indicated by the PWGx-pipeline-node-terminal
        // class
        return graph.locator(".PWGx-pipeline-node:not(:has(.PWGx-pipeline-node-terminal))");
    }
}
