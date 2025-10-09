package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.List;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

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
