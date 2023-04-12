package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.Functions;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepVisitor;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.List;
import net.sf.json.JSONObject;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;

public class PipelineConsoleViewActionTest {
    @Rule
    public JenkinsRule j = new JenkinsRule();

    private static final String TEXT = "Hello, World!" + System.lineSeparator();

    @Issue("GH#224")
    @Test
    public void getConsoleLogReturnLogText() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), 0L);
        assertThat(consoleJson.getString("endByte"), is(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), is("0"));
        assertThat(consoleJson.getString("text"), is(TEXT));
    }

    @Issue("GH#224")
    @Test
    public void getConsoleLogReturnsErrorText() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world_scripted", "simpleError.jenkinsfile", Result.FAILURE);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
        String stageId = TestUtils.getNodesByDisplayName(run, "A").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper errorStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(errorStep.getId(), 0L);
        assertThat(consoleJson.getString("endByte"), is("16"));
        assertThat(consoleJson.getString("startByte"), is("0"));
        assertThat(consoleJson.getString("text"), is("This is an error"));
    }

    @Issue("GH#224")
    @Test
    public void getConsoleLogReturnLogTextWithOffset() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), 7L);
        assertThat(consoleJson.getString("endByte"), is(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), is("7"));
        assertThat(consoleJson.getString("text"), is("World!" + System.lineSeparator()));
    }

    @Issue("GH#224")
    @Test
    public void getConsoleLogReturnLogTextWithNegativeOffset() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), -7L);
        // 14-7
        assertThat(consoleJson.getString("endByte"), is(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), is(String.valueOf(7 + (Functions.isWindows() ? 1 : 0))));
        String value = (Functions.isWindows() ? "" : "W") + "orld!" + System.lineSeparator();
        assertThat(consoleJson.getString("text"), is(value));
    }

    @Issue("GH#224")
    @Test
    public void getConsoleLogReturnLogTextWithLargeNegativeOffset() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(echoStep.getId(), -1000L);
        assertThat(consoleJson.getString("endByte"), is(String.valueOf(TEXT.length())));
        assertThat(consoleJson.getString("startByte"), is("0"));
        assertThat(consoleJson.getString("text"), is(TEXT));
    }

    @Issue("GH#224")
    @Test
    public void getConsoleLogReturnLogTextWithLargeOffset() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
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
    public void getConsoleLogOfStepWithOutputAndException() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "exec_returns_error", "execStepReturnsError.jenkinsfile", Result.FAILURE);

        PipelineStepVisitor builder = new PipelineStepVisitor(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        // There is an 'isUnix()' step before this.
        FlowNodeWrapper execStep = stepNodes.get(1);

        PipelineConsoleViewAction consoleAction = new PipelineConsoleViewAction(run);
        JSONObject consoleJson = consoleAction.getConsoleOutputJson(execStep.getId(), 0L);
        assertThat(consoleJson.getString("startByte"), is("0"));
        assertThat(
                consoleJson.getString("text"),
                stringContainsInOrder("echo", "Hello, world!", "script returned exit code 1"));
    }
}
