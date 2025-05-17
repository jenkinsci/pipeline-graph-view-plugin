package io.jenkins.plugins.pipelinegraphview;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.Response;
import hudson.model.Result;
import hudson.model.queue.QueueTaskFuture;
import io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;

import static org.junit.Assert.assertTrue;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineGraphViewCancelTest {

    @Test
    void cancelButtonCancelsBuild(JenkinsRule j) throws Exception {
        QueueTaskFuture<WorkflowRun> futureRun = TestUtils.createAndRunJobNoWait(j, "indefiniteWait", "indefiniteWait.jenkinsfile");
        WorkflowRun run = futureRun.waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        cancelRun(j, run);
        SemaphoreStep.success("wait/1", null);
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
    }

    private static void cancelRun(JenkinsRule j, WorkflowRun run) throws Exception {
        try (Playwright playwright = Playwright.create();
                Browser browser = playwright.chromium().launch()) {
            Page page = browser.newPage();
            String urlName = new PipelineConsoleViewAction(run).getUrlName();
            page.navigate(j.getURL() + run.getUrl() + urlName);
            page.click("#pgv-cancel");
        }
    }
}
