package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.Functions;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.List;
import net.sf.json.JSONObject;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineConsoleViewActionTest {

    private static final String TEXT = "Hello, World!" + System.lineSeparator();

    @Issue("GH#224")
    @Test
    void getConsoleLogReturnLogText(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), 0L);
        assertThat(consoleJson.getString("endByte"), equalTo(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), equalTo("0"));
        assertThat(consoleJson.getString("text"), equalTo(TEXT));
    }

    @Issue("GH#224")
    @Test
    void getConsoleLogReturnsNoErrorText(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world_scripted", "simpleError.jenkinsfile", Result.FAILURE);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId = TestUtils.getNodesByDisplayName(run, "A").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper errorStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(errorStep.getId(), 0L);
        assertThat(consoleJson.getString("endByte"), equalTo("0"));
        assertThat(consoleJson.getString("startByte"), equalTo("0"));
        assertThat(consoleJson.getString("text"), equalTo(""));
    }

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

    @Issue("GH#224")
    @Test
    void getConsoleLogReturnLogTextWithOffset(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), 7L);
        assertThat(consoleJson.getString("endByte"), equalTo(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), equalTo("7"));
        assertThat(consoleJson.getString("text"), equalTo("World!" + System.lineSeparator()));
    }

    @Issue("GH#224")
    @Test
    void getConsoleLogReturnLogTextWithNegativeOffset(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), -7L);
        // 14-7
        assertThat(consoleJson.getString("endByte"), equalTo(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), equalTo(String.valueOf(7 + (Functions.isWindows() ? 1 : 0))));
        String value = (Functions.isWindows() ? "" : "W") + "orld!" + System.lineSeparator();
        assertThat(consoleJson.getString("text"), equalTo(value));
    }

    @Issue("GH#224")
    @Test
    void getConsoleLogReturnLogTextWithLargeNegativeOffset(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), -1000L);
        assertThat(consoleJson.getString("endByte"), equalTo(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), equalTo("0"));
        assertThat(consoleJson.getString("text"), equalTo(TEXT));
    }

    @Issue("GH#224")
    @Test
    void getConsoleLogReturnLogTextWithLargeOffset(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), 1000L);
        assertThat(consoleJson, is(nullValue()));
    }

    @Issue("GH#224")
    @Test
    void getConsoleLogOfStepWithOutputAndException(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "exec_returns_error", "execStepReturnsError.jenkinsfile", Result.FAILURE);
        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        // There is an 'isUnix()' step before this.
        FlowNodeWrapper execStep = stepNodes.get(1);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(execStep.getId(), 0L);
        assertThat(consoleJson.getString("startByte"), equalTo("0"));
        assertThat(consoleJson.getString("text"), stringContainsInOrder("echo", "Hello, world!"));
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
}
