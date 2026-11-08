package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.actions.PauseAction;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class LiveGraphPauseTest {

    /**
     * Steps such as {@code input} and {@code lock} pause after their node has been added, and
     * no further node is added while they wait.
     */
    @Test
    void stepThatPausesAfterItsNodeWasAddedShowsAsPaused(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "pauses");
        job.setDefinition(new CpsFlowDefinition("stage('Waiting') { semaphore 'wait' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        PipelineGraphApi graphApi = new PipelineGraphApi(run);
        PipelineStepApi stepApi = new PipelineStepApi(run);

        assertThat(stageState(graphApi), is(PipelineState.RUNNING));
        assertThat(stepState(stepApi), is(PipelineState.RUNNING));

        FlowNode semaphore = run.getExecution().getCurrentHeads().get(0);
        semaphore.addAction(new PauseAction("Lock"));

        assertThat(stageState(graphApi), is(PipelineState.PAUSED));
        assertThat(stepState(stepApi), is(PipelineState.PAUSED));

        PauseAction.endCurrentPause(semaphore);
        SemaphoreStep.success("wait/1", null);
        j.assertBuildStatusSuccess(j.waitForCompletion(run));
    }

    private static PipelineState stageState(PipelineGraphApi api) {
        return api.createTree().stages.get(0).getState();
    }

    private static PipelineState stepState(PipelineStepApi api) {
        return api.getAllSteps().steps.get(0).getState();
    }
}
