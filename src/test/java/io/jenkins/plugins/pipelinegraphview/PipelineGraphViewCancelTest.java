package io.jenkins.plugins.pipelinegraphview;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import com.microsoft.playwright.options.AriaRole;
import hudson.model.Result;
import io.jenkins.plugins.casc.misc.ConfiguredWithCode;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineOverviewPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;

@WithJenkinsConfiguredWithCode
@UsePlaywright(PlaywrightConfig.class)
class PipelineGraphViewCancelTest {

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void cancelButtonCancelsBuild(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJobNoWait(j, "indefiniteWait", "indefiniteWait.jenkinsfile")
                .waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        PipelineOverviewPage op = new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview();

        Locator cancelLocator = p.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Cancel"));
        assertThat(cancelLocator).isVisible();

        op.cancel();

        SemaphoreStep.success("wait/1", null);
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));

        assertThat(cancelLocator).isHidden();
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void cancelButtonDisappears(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJobNoWait(j, "indefiniteWait", "indefiniteWait.jenkinsfile")
                .waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview();

        Locator cancelLocator = p.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Cancel"));
        assertThat(cancelLocator).isVisible();

        SemaphoreStep.success("wait/1", null);
        j.assertBuildStatus(Result.SUCCESS, j.waitForCompletion(run));

        assertThat(cancelLocator).isHidden();
    }
}
