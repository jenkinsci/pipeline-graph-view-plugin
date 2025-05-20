package io.jenkins.plugins.pipelinegraphview;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.Response;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction;
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
    void rerunButtonStartsNewBuild(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        rerunBuildAndAssertPageIsTheSame(p, j, run);
    }

    @Test
    void replayButtonRedirects(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        replayBuildAndAssertReplayPage(p, j, run);
    }

    @Issue("GH#617")
    @Test
    void rebuildButtonRedirectsForParameterizedJob(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "echo_parameterized", "gh330_parameterizedBuild.jenkinsfile", Result.SUCCESS);

        rebuildBuildAndAssertRebuildPage(p, j, run);
    }

    private static void rerunBuildAndAssertPageIsTheSame(Page p, JenkinsConfiguredWithCodeRule j, WorkflowRun run)
            throws Exception {
        String urlName = new PipelineConsoleViewAction(run).getUrlName();
        Response navigate = p.navigate(j.getURL() + run.getUrl() + urlName);
        String currentUrl = navigate.url();

        p.click("#pgv-rerun");
        String newUrl = p.url();

        assertEquals(currentUrl, newUrl);

        waitUntilBuildIsComplete(j, run);
    }

    private static void replayBuildAndAssertReplayPage(Page p, JenkinsConfiguredWithCodeRule j, WorkflowRun run)
            throws Exception {
        String urlName = new PipelineConsoleViewAction(run).getUrlName();
        p.navigate(j.getURL() + run.getUrl() + urlName);
        p.click("#pgv-rerun-overflow");
        p.click("#pgv-replay");

        String newUrl = p.url();
        String targetUrl = j.getURL() + run.getUrl() + "replay/";
        assertEquals(targetUrl, newUrl);

        j.assertBuildStatus(Result.SUCCESS, j.waitForCompletion(run));
    }

    private static void rebuildBuildAndAssertRebuildPage(Page p, JenkinsConfiguredWithCodeRule j, WorkflowRun run)
            throws Exception {
        String urlName = new PipelineConsoleViewAction(run).getUrlName();
        p.navigate(j.getURL() + run.getUrl() + urlName);
        p.click("#pgv-rerun-overflow");
        p.click("#pgv-rebuild");

        String newUrl = p.url();
        String targetUrl = j.getURL() + run.getUrl() + "rebuild/parameterized";
        assertEquals(targetUrl, newUrl);

        j.assertBuildStatus(Result.SUCCESS, j.waitForCompletion(run));
    }

    // We don't care about the build result but Windows fails with
    // file locking issues if we don't wait for the build to finish.
    private static void waitUntilBuildIsComplete(JenkinsConfiguredWithCodeRule j, WorkflowRun run) {
        await().until(() -> j.jenkins.getQueue().isEmpty(), is(true));
        WorkflowJob parent = run.getParent();
        await().until(() -> parent.getBuilds().size(), is(2));

        WorkflowRun lastBuild = parent.getLastBuild();
        await().until(() -> lastBuild, RunMatchers.completed());
    }
}
