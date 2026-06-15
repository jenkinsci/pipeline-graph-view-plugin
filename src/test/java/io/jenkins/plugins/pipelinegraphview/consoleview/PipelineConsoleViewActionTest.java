package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.io.IOException;
import java.util.List;
import org.htmlunit.WebRequest;
import org.htmlunit.WebResponse;
import org.htmlunit.html.DomElement;
import org.htmlunit.html.HtmlPage;
import org.htmlunit.util.UrlUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import org.kohsuke.stapler.HttpResponse;

@WithJenkins
class PipelineConsoleViewActionTest {
    @Issue("GH#224")
    @Test
    void getNodeExceptionTextWithScriptError(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world_scripted", "simpleError.jenkinsfile", Result.FAILURE);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId = TestUtils.getNodesByDisplayName(run, "A").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper errorStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        String message = consoleAction.getNodeExceptionText(errorStep.getId());
        assertThat(message, equalTo("This is an error"));
    }

    void shouldHaveConsoleText(JenkinsRule j, WorkflowRun run, String nodeId, String expectedText) throws IOException {
        try (var c = j.createWebClient()) {
            WebRequest req =
                    new WebRequest(UrlUtils.toUrlSafe(j.getURL() + run.getUrl() + "stages/log?nodeId=" + nodeId));
            WebResponse rsp = c.loadWebResponse(req);
            assertThat(rsp.getContentAsString(), equalTo(expectedText));
        }
    }

    @Issue("GH#947")
    @Test
    void getConsoleTextWithScriptError(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "gh947_stage_mixed_result", "gh947_stage_mixed_result.jenkinsfile", Result.FAILURE);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId = TestUtils.getNodesByDisplayName(run, "A").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        assertThat(stepNodes.size(), equalTo(3));

        shouldHaveConsoleText(j, run, stageId, "Hello world\nThis error is caught\nThis is a fatal error\n");
        shouldHaveConsoleText(j, run, stepNodes.get(0).getId(), "Hello world\n");
        shouldHaveConsoleText(j, run, stepNodes.get(1).getId(), "This error is caught");
        shouldHaveConsoleText(j, run, stepNodes.get(2).getId(), "This is a fatal error");
    }

    @Issue("GH#224")
    @Test
    void getNodeExceptionTextWithStepError(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "exec_returns_error", "execStepReturnsError.jenkinsfile", Result.FAILURE);
        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        // There is an 'isUnix()' step before this.
        FlowNodeWrapper execStep = stepNodes.get(1);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        String message = consoleAction.getNodeExceptionText(execStep.getId());
        assertThat(message, equalTo("script returned exit code 1"));
    }

    @Issue("GH#1047")
    @Test
    void getBuildUrlResolvesLastXXX(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world_scripted", "simpleError.jenkinsfile", Result.FAILURE);

        try (var c = j.createWebClient()) {
            HtmlPage page = c.goTo(run.getParent().getUrl() + "lastBuild/stages");
            DomElement root = page.getElementById("console-pipeline-root");
            assertThat(root, notNullValue());
            assertThat(root.getAttribute("data-current-run-path"), endsWith("/" + run.getNumber() + "/"));
        }
    }

    @Test
    void doRerunReturnsErrorWhenReplayActionIsNull(JenkinsRule j) throws Exception {
        // Create a pipeline run.
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world_scripted", "simpleError.jenkinsfile", Result.FAILURE);

        // Remove the ReplayAction so that run.getAction(ReplayAction.class) returns null.
        run.removeActions(org.jenkinsci.plugins.workflow.cps.replay.ReplayAction.class);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        HttpResponse response = consoleAction.doRerun();
        assertThat(response, notNullValue());
    }
}
