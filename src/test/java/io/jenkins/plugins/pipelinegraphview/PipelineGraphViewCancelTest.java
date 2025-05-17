package io.jenkins.plugins.pipelinegraphview;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.CoreMatchers.is;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineGraphViewCancelTest {

    @Test
    void cancelButtonCancelsBuild(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "indefiniteWait", "indefiniteWait.jenkinsfile", Result.SUCCESS);

        try (Playwright playwright = Playwright.create();
                Browser browser = playwright.chromium().launch()) {
            Page page = browser.newPage();
            String urlName = new PipelineConsoleViewAction(run).getUrlName();
            page.navigate(j.getURL() + run.getUrl() + urlName);

            page.click("#pgv-cancel");

            SemaphoreStep.waitForStart("wait/1", run);
            await().until(() -> run.isBuilding(), is(false));

            SemaphoreStep.success("wait/1", null);

            j.assertBuildStatus(Result.ABORTED, run);
        }
    }
}
