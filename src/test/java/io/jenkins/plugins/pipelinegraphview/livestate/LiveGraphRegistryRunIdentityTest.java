package io.jenkins.plugins.pipelinegraphview.livestate;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.sameInstance;

import hudson.model.Result;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class LiveGraphRegistryRunIdentityTest {

    @Test
    void entryOfAKilledRunIsNotUsedOrRemovedForTheRecreatedJobsRun(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "recreated");
        job.setDefinition(new CpsFlowDefinition("stage('old') { semaphore 'old' }", true));
        WorkflowRun oldRun = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("old/1", oldRun);
        FlowExecution oldExecution = oldRun.getExecution();
        oldRun.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(oldRun));
        // The killed run's execution keeps running, and a node it adds recreates its entry
        // under the job/build id the new run reuses.
        LiveGraphState stale = LiveGraphRegistry.get().getOrCreate(oldExecution);
        LiveGraphPopulator.catchUp(oldExecution, stale);
        stale.markReady();
        job.delete();

        job = j.createProject(WorkflowJob.class, "recreated");
        job.setDefinition(new CpsFlowDefinition("stage('new') { semaphore 'new' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        assertThat(run.getNumber(), is(oldRun.getNumber()));
        SemaphoreStep.waitForStart("new/1", run);

        LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
        assertThat(snapshot, is(notNullValue()));
        assertThat(
                snapshot.nodes().stream().map(FlowNode::getExecution).toList(),
                everyItem(is(sameInstance(run.getExecution()))));

        LiveGraphRegistry.get().remove(oldRun);
        assertThat(LiveGraphRegistry.get().snapshot(run), is(notNullValue()));
        assertThat(LiveGraphRegistry.get().getOrCreate(run.getExecution()), is(not(sameInstance(stale))));

        SemaphoreStep.success("new/1", null);
        j.assertBuildStatusSuccess(j.waitForCompletion(run));
    }
}
