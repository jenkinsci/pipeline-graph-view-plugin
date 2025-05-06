package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraph {

    private static final Logger log = LoggerFactory.getLogger(PipelineGraph.class);
    private final Locator wrapper;

    public PipelineGraph(Locator wrapper) {
        this.wrapper = wrapper;
    }

    public PipelineGraph hasStages(int count) {
        log.info("Checking that {} nodes are visible for the build", count);
        assertThat(getStages()).hasCount(count);

        return this;
    }

    private Locator getStages() {
        // select all those apart from the start and end nodes which are indicated by the PWGx-pipeline-node-terminal
        // class
        return wrapper.locator(".PWGx-pipeline-node:not(:has(.PWGx-pipeline-node-terminal))");
    }

    public PipelineGraph stageHasName(int index, String name) {
        assertThat(getStages().nth(index)).hasText(name);

        return this;
    }
}
