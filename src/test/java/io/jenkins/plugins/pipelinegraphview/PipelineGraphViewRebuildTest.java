package io.jenkins.plugins.pipelinegraphview;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.Response;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import jenkins.test.RunMatchers;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineGraphViewRebuildTest {

    @Issue("GH#330")
    @Test
    void rebuildButtonStartsNewBuild(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        startBuildAndAssertPageIsTheSame(j, run);
    }

    @Issue("GH#330")
    @Test
    void rebuildButtonRedirectsForParameterizedJob(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "echo_parameterized", "gh330_parameterizedBuild.jenkinsfile", Result.SUCCESS);

        startBuildAndAssertPageIsTheSame(j, run);
    }

    private static void startBuildAndAssertPageIsTheSame(JenkinsRule j, WorkflowRun run) throws Exception {
        try (Playwright playwright = Playwright.create();
                Browser browser = playwright.chromium().launch()) {
            Page page = browser.newPage();
            String urlName = new PipelineConsoleViewAction(run).getUrlName();
            Response navigate = page.navigate(j.getURL() + run.getUrl() + urlName);
            String currentUrl = navigate.url();

            page.click("#pgv-rebuild");
            String newUrl = page.url();

            assertEquals(currentUrl, newUrl);

            waitUntilBuildIsComplete(j, run);
        }
    }

    // We don't care about the build result but Windows fails with
    // file locking issues if we don't wait for the build to finish.
    private static void waitUntilBuildIsComplete(JenkinsRule j, WorkflowRun run) {
        await().until(() -> j.jenkins.getQueue().isEmpty(), is(true));
        WorkflowJob parent = run.getParent();
        await().until(() -> parent.getBuilds().size(), is(2));

        WorkflowRun lastBuild = parent.getLastBuild();
        await().until(() -> lastBuild, RunMatchers.completed());
    }
}
