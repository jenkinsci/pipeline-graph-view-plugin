package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;

import hudson.model.Result;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

/**
 * Deleting and recreating a job restarts build numbers at 1, so the new build has the same
 * externalizable id as the old one. The plugin's per-run caches are keyed by that id, so a live
 * state left behind by a run that never completed (e.g. a force-killed one) must not be reused
 * by the new job's build.
 */
@WithJenkins
class RecreatedJobTest {

    @Test
    void recreatedJobDoesNotReuseTheOldRunsLiveState(JenkinsRule j) throws Exception {
        WorkflowJob oldJob = j.createProject(WorkflowJob.class, "recreated");
        oldJob.setDefinition(new CpsFlowDefinition("stage('old') { semaphore 'oldWait' }", true));
        WorkflowRun oldRun = oldJob.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("oldWait/1", oldRun);

        // A force kill leaves the run without an execution, so FlowExecutionListener#onCompleted
        // never fires and the live state is never evicted.
        oldRun.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(oldRun));
        new PipelineGraphApi(oldRun).createTree();

        oldJob.delete();

        WorkflowJob newJob = j.createProject(WorkflowJob.class, "recreated");
        newJob.setDefinition(new CpsFlowDefinition("stage('new') { semaphore 'newWait' }", true));
        WorkflowRun newRun = newJob.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("newWait/1", newRun);

        PipelineGraph whileRunning = new PipelineGraphApi(newRun).createTree();
        assertThat("the recreated job's build must show its own stage", stageNames(whileRunning), contains("new"));

        SemaphoreStep.success("newWait/1", null);
        j.assertBuildStatusSuccess(j.waitForCompletion(newRun));

        PipelineGraph afterCompletion = new PipelineGraphApi(newRun).createTree();
        assertThat("the completed build must still show its own stage", stageNames(afterCompletion), contains("new"));
    }

    private static List<String> stageNames(PipelineGraph graph) {
        return graph.stages.stream().map(PipelineStage::getName).toList();
    }
}
