package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.console.AnnotatedLargeText;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.List;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineNodeUtilTest {

    @Issue("GH#224")
    @Test
    void canGetLogTextFromStep(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId =
                TestUtils.getNodesByDisplayName(run, "Say Hello").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper echoStep = stepNodes.get(0);
        AnnotatedLargeText<? extends FlowNode> logText = PipelineNodeUtil.getLogText(echoStep.getNode());
        String logString = PipelineNodeUtil.convertLogToString(logText);
        assertThat(logString, equalTo("Hello, World!" + System.lineSeparator()));
    }

    @Issue("GH#224")
    @Test
    void canGetErrorTextFromStep(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "simple_error", "simpleError.jenkinsfile", Result.FAILURE);
        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId = TestUtils.getNodesByDisplayName(run, "A").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper errorStep = stepNodes.get(0);
        assertThat(PipelineNodeUtil.getExceptionText(errorStep.getNode()), equalTo("This is an error"));
    }

    @Issue("GH#213")
    @Test
    void pipelineCallsUndefinedVar(JenkinsRule j) throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "githubIssue213_callsUnknownVariable", "callsUnknownVariable.jenkinsfile", Result.FAILURE);

        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        String stageId = TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        FlowNodeWrapper errorStep = stepNodes.get(1);
        assertThat(
                PipelineNodeUtil.getExceptionText(errorStep.getNode()),
                startsWith(
                        "Found unhandled groovy.lang.MissingPropertyException exception:\nNo such property: undefined for class: groovy.lang.Binding"));
    }
}
