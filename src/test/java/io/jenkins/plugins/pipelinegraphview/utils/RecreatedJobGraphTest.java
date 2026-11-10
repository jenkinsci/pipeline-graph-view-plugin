package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;

import hudson.model.Result;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class RecreatedJobGraphTest {

    @Test
    void recreatedJobDoesNotReuseTheKilledRunsLiveState(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "recreated");
        job.setDefinition(new CpsFlowDefinition("stage('old') { semaphore 'old' }", true));
        WorkflowRun oldRun = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("old/1", oldRun);
        oldRun.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(oldRun));
        job.delete();

        job = j.createProject(WorkflowJob.class, "recreated");
        job.setDefinition(
                new CpsFlowDefinition("stage('new-a') { echo 'a' }\nstage('new-b') { semaphore 'new' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        assertThat(run.getNumber(), is(oldRun.getNumber()));
        SemaphoreStep.waitForStart("new/1", run);

        PipelineGraph running = new PipelineGraphApi(run).createTree();
        assertThat(running.stages.stream().map(PipelineStage::getName).toList(), contains("new-a", "new-b"));

        SemaphoreStep.success("new/1", null);
        j.assertBuildStatusSuccess(j.waitForCompletion(run));
        PipelineGraph done = new PipelineGraphApi(run).createTree();
        assertThat(done.complete, is(true));
        assertThat(
                done.stages.stream().map(PipelineStage::getState).toList(),
                contains(PipelineState.SUCCESS, PipelineState.SUCCESS));
    }
}
