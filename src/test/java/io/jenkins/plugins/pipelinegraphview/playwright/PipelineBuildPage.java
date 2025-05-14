package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class PipelineBuildPage extends JenkinsPage<PipelineBuildPage> {
    private final String buildName;
    private final PipelineGraph graph;

    public PipelineBuildPage(Page page, String pageUrl, String buildName) {
        super(page, pageUrl);
        this.buildName = buildName;
        this.graph = new PipelineGraph(getPipelineSection());
    }

    @Override
    PipelineBuildPage waitForLoaded() {
        super.waitForLoaded();
        Locator heading = page.getByRole(
                AriaRole.HEADING, new Page.GetByRoleOptions().setLevel(1).setName(buildName));
        assertThat(heading).isVisible();
        graph.isVisible();
        return this;
    }

    private Locator getPipelineSection() {
        return page.locator("#graph").locator(".PWGx-PipelineGraph-container");
    }

    public PipelineBuildPage hasStagesInGraph(int count, String... stages) {
        graph.hasStages(count, stages);
        return this;
    }

    public PipelineOverviewPage goToPipelineOverview() {
        page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Pipeline Overview"))
                .click();

        return new PipelineOverviewPage(page, pageUrl, this.buildName).waitForLoaded();
    }
}
