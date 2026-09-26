package io.jenkins.plugins.pipelinegraphview.utils;

import static jenkins.test.RunMatchers.completed;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.Queue;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineNodeUtilTest {

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

    @Issue("GH#583")
    @Test
    void isStageTest(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "githubIssue583_stages", "gh583_stages.jenkinsfile", Result.SUCCESS);
        PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
        FlowNode stageANode = TestUtils.getNodesByDisplayName(run, "A").get(0);
        assertFalse(PipelineNodeUtil.isStep(stageANode));
        assertTrue(PipelineNodeUtil.isStage(stageANode));
        assertFalse(PipelineNodeUtil.isParallelBranch(stageANode));

        FlowNode stageCNode = TestUtils.getNodesByDisplayName(run, "C").get(0);
        String stageCId = stageCNode.getId();
        assertFalse(PipelineNodeUtil.isStep(stageCNode));
        assertTrue(PipelineNodeUtil.isStage(stageCNode));
        assertFalse(PipelineNodeUtil.isParallelBranch(stageCNode));

        List<FlowNodeWrapper> stageCSteps = builder.getStageSteps(stageCId);
        FlowNode stepCEcho = stageCSteps.get(0).getNode();
        assertTrue(PipelineNodeUtil.isStep(stepCEcho));
        assertFalse(PipelineNodeUtil.isStage(stepCEcho));
        assertFalse(PipelineNodeUtil.isParallelBranch(stepCEcho));

        FlowNode stageDNode = TestUtils.getNodesByDisplayName(run, "D").get(0);
        String stageDId = stageDNode.getId();
        assertFalse(PipelineNodeUtil.isStep(stageDNode));
        assertTrue(PipelineNodeUtil.isStage(stageDNode));
        assertFalse(PipelineNodeUtil.isParallelBranch(stageDNode));

        List<FlowNodeWrapper> stageDSteps = builder.getStageSteps(stageDId);
        FlowNode stepDEcho = stageDSteps.get(0).getNode();
        assertTrue(PipelineNodeUtil.isStep(stepDEcho));
        assertFalse(PipelineNodeUtil.isStage(stepDEcho));
        assertFalse(PipelineNodeUtil.isParallelBranch(stepDEcho));

        FlowNode branchB1Node =
                TestUtils.getNodesByDisplayName(run, "Branch: B1").get(0);
        assertFalse(PipelineNodeUtil.isStep(branchB1Node));
        assertFalse(PipelineNodeUtil.isStage(branchB1Node));
        assertTrue(PipelineNodeUtil.isParallelBranch(branchB1Node));

        FlowNode branchB2Node =
                TestUtils.getNodesByDisplayName(run, "Branch: B2").get(0);
        assertFalse(PipelineNodeUtil.isStep(branchB2Node));
        assertFalse(PipelineNodeUtil.isStage(branchB2Node));
        assertTrue(PipelineNodeUtil.isParallelBranch(branchB2Node));
    }

    @Issue("GH#486")
    @Test
    void getCauseOfBlockageReportsExecutorWait(JenkinsRule j) throws Exception {
        // The label "no-such-agent" matches no executor, so the node step blocks on the queue.
        WorkflowJob job = j.jenkins.createProject(WorkflowJob.class, "queuedExecutorWait");
        job.setDefinition(new CpsFlowDefinition("""
                stage('Build') {
                  node('no-such-agent') {
                    echo 'never reached'
                  }
                }
                """, true));

        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        try {
            j.waitForMessage("Still waiting to schedule task", run);

            FlowNode stage = TestUtils.getNodesByDisplayName(run, "Build").get(0);
            String cause = PipelineNodeUtil.getCauseOfBlockage(stage);

            assertNotNull(cause, "Expected a non-null cause of blockage for a queued stage");
            assertThat(cause, containsString("no-such-agent"));
        } finally {
            for (Queue.Item item : Queue.getInstance().getItems()) {
                Queue.getInstance().cancel(item);
            }
            run.doStop();
            await().until(() -> run, completed());
        }
    }
}
