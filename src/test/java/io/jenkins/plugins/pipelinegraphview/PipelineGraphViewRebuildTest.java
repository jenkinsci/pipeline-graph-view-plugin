package io.jenkins.plugins.pipelinegraphview;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.Response;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.io.IOException;
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

    private static void startBuildAndAssertPageIsTheSame(JenkinsRule j, WorkflowRun run) throws IOException {
        try (Playwright playwright = Playwright.create();
                Browser browser = playwright.chromium().launch()) {
            Page page = browser.newPage();
            String urlName = new PipelineGraphViewAction(run).getUrlName();
            Response navigate = page.navigate(j.getURL() + run.getUrl() + urlName);
            String currentUrl = navigate.url();

            page.click("#pgv-rebuild");
            String newUrl = page.url();

            assertEquals(currentUrl, newUrl);
        }
    }
}
