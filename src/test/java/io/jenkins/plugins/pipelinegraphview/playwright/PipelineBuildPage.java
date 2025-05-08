package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class PipelineBuildPage extends JenkinsPage<PipelineBuildPage> {
    private final String buildName;

    public PipelineBuildPage(Page page, String pageUrl, String buildName) {
        super(page, pageUrl);
        this.buildName = buildName;
    }

    @Override
    PipelineBuildPage waitForLoaded() {
        super.waitForLoaded();
        Locator heading = page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setLevel(1).setName(buildName));
        assertThat(heading).isVisible();
        assertThat(getPipelineSection()).isVisible();
        return this;
    }

    private Locator getPipelineSection() {
        return page.locator("#graph").locator(".PWGx-PipelineGraph-container");
    }

    public PipelineGraph graph() {
        return new PipelineGraph(getPipelineSection());
    }

    public PipelineConsolePage goToPipelineConsole() {
        page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Pipeline Console")).click();

        String pageUrl = this.pageUrl + "pipeline-console/";

        return new PipelineConsolePage(page, pageUrl, this.buildName).waitForLoaded();
    }
}
