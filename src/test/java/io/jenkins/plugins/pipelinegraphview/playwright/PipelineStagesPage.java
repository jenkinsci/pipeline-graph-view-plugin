package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The Stages page of a job, which lists the builds with their stage graphs.
 */
public class PipelineStagesPage extends JenkinsPage<PipelineStagesPage> {

    private static final Logger log = LoggerFactory.getLogger(PipelineStagesPage.class);
    private final String jobName;

    public PipelineStagesPage(Page page, WorkflowJob job) {
        super(page, job.getAbsoluteUrl() + "multi-pipeline-graph/");
        jobName = job.getDisplayName();
    }

    @Override
    PipelineStagesPage waitForLoaded() {
        super.waitForLoaded();
        assertThat(getBuildButton()).isVisible();
        return this;
    }

    public PipelineStagesPage build() {
        log.info("Clicking the build button on the Stages page of the job {}", jobName);
        getBuildButton().click();
        return this;
    }

    private Locator getBuildButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Build"));
    }
}
