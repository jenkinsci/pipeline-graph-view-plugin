package io.jenkins.plugins.pipelinegraphview;

import static org.junit.jupiter.api.Assertions.assertEquals;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.htmlunit.html.HtmlPage;
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

        try (JenkinsRule.WebClient webClient = j.createWebClient()) {
            HtmlPage page = webClient.getPage(run, new PipelineGraphViewAction(run).getUrlName());
            HtmlPage newPage = page.getElementById("pgv-rebuild").click();
            assertEquals(page.getBaseURL(), newPage.getBaseURL());
        }
    }

    @Issue("GH#330")
    @Test
    void rebuildButtonRedirectsForParameterizedJob(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "echo_parameterized", "gh330_parameterizedBuild.jenkinsfile", Result.SUCCESS);

        try (JenkinsRule.WebClient webClient = j.createWebClient()) {
            // the build page is returned with a 405 Method Not Allowed status code, but the page
            // exists and can be worked with; we should not fail on this status code
            webClient.getOptions().setThrowExceptionOnFailingStatusCode(false);

            HtmlPage page = webClient.getPage(run, new PipelineGraphViewAction(run).getUrlName());
            HtmlPage newPage = page.getElementById("pgv-rebuild").click();
            assertEquals(page.getBaseURL(), newPage.getBaseURL());
        }
    }
}
