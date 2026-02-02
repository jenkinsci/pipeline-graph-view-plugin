package io.jenkins.plugins.pipelinegraphview;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.casc.misc.ConfiguredWithCode;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineOverviewPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import jenkins.test.RunMatchers;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;

@WithJenkinsConfiguredWithCode
@UsePlaywright(PlaywrightConfig.class)
class PipelineGraphViewRebuildTest {

    @Issue("GH#330")
    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void rerunButtonStartsNewBuild(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);
        WorkflowJob job = run.getParent();

        PipelineOverviewPage op = new PipelineJobPage(p, job)
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview();

        String jobUrl = j.getURL() + job.getUrl();
        assertThat(p).hasURL(jobUrl + "1/stages/");

        op.rerun();

        assertThat(p).hasURL(jobUrl + "2/stages/");

        waitUntilBuildIsComplete(j, run);
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void replayButtonRedirects(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .replay();

        String newUrl = p.url();
        String targetUrl = j.getURL() + run.getUrl() + "replay/";
        assertEquals(targetUrl, newUrl);
    }

    @Issue("GH#617")
    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void rebuildButtonRedirectsForParameterizedJob(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "echo_parameterized", "gh330_parameterizedBuild.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .rebuild();

        String newUrl = p.url();
        String targetUrl = j.getURL() + run.getUrl() + "rebuild/parameterized";
        assertEquals(targetUrl, newUrl);
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void restartFromStageButtonRedirects(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world", "helloWorldDeclarativePipeline.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .restartFromStage();

        String newUrl = p.url();
        String targetUrl = j.getURL() + run.getUrl() + "restart/";
        assertEquals(targetUrl, newUrl);
    }

    // We don't care about the build result but Windows fails with
    // file locking issues if we don't wait for the build to finish.
    private static void waitUntilBuildIsComplete(JenkinsConfiguredWithCodeRule j, WorkflowRun run) {
        await().until(() -> j.jenkins.getQueue().isEmpty(), is(true));
        WorkflowJob parent = run.getParent();
        await().until(parent::getBuilds, hasSize(2));

        WorkflowRun lastBuild = parent.getLastBuild();
        await().until(() -> lastBuild, RunMatchers.completed());
    }
}
