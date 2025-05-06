package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineJobPage extends JenkinsPage<PipelineJobPage> {

    private static final Logger log = LoggerFactory.getLogger(PipelineJobPage.class);
    private final String jobName;

    public PipelineJobPage(Page page, WorkflowJob job) {
        super(page, job.getAbsoluteUrl());
        jobName = job.getDisplayName();
    }

    @Override
    void waitForLoaded() {
        isAtUrl(pageUrl);
        Locator heading = page.getByRole(
                AriaRole.HEADING, new Page.GetByRoleOptions().setName(jobName).setLevel(1));
        assertThat(heading).isVisible();
        assertThat(getPipelineSection()).isVisible();
    }

    public PipelineJobPage hasBuilds(int count) {
        log.info("Checking that {} builds are visible for the job {}", count, jobName);
        assertThat(getPipelineSection().locator(".pgv-single-run")).hasCount(count);
        log.info("Verified {} builds are visible", count);
        return this;
    }

    private Locator getPipelineSection() {
        return page.locator("#multiple-pipeline-root");
    }

    public PipelineBuild nthBuild(int index) {
        log.info("Getting the {} build for the job {}", index, jobName);
        Locator build = getPipelineSection().locator(".pgv-single-run").nth(0);
        assertThat(build).isVisible();

        return new PipelineBuild(build);
    }

    public static class PipelineBuild {

        private final Locator wrapper;
        private final PipelineGraph graph;

        public PipelineBuild(Locator wrapper) {
            this.wrapper = wrapper;
            this.graph = new PipelineGraph(wrapper.locator(".PWGx-PipelineGraph-container"));
        }

        public PipelineBuild hasStages(int count) {
            graph.hasStages(count);

            return this;
        }

        public PipelineBuild stageHasName(int index, String name) {
            graph.stageHasName(index, name);

            return this;
        }

        public void goToBuild() {
            wrapper.getByRole(AriaRole.LINK).nth(0).click();
        }
    }
}
