package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphSnapshot;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

/**
 * A graph request can capture its liveness snapshot while the run is still executing and
 * finish building the graph after the run has completed. The statuses it computes still
 * describe a running pipeline, so the response must stay incomplete: the frontend polls again
 * and gets the final graph. Marking it complete stops polling, which leaves the running
 * animation on screen forever.
 */
@WithJenkins
class StaleSnapshotCompletionTest {

    @Test
    void graphBuiltFromSnapshotTakenBeforeCompletionStaysIncomplete(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "stale-snapshot");
        job.setDefinition(new CpsFlowDefinition("stage('one') { semaphore 'wait' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);

        LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
        assertThat("live snapshot present while running", snapshot, is(notNullValue()));
        assertThat("a snapshot taken mid-run is incomplete", snapshot.complete(), is(false));
        assertThat(
                "the snapshot's liveness view contains the running stage", snapshot.activeNodeIds(), is(not(empty())));

        SemaphoreStep.success("wait/1", null);
        j.waitForCompletion(run);
        assertThat("test setup: the execution has completed", run.getExecution().isComplete(), is(true));

        PipelineNodeGraphAdapter adapter = new PipelineNodeGraphAdapter(
                run, snapshot.nodes(), snapshot.enclosingIdsByNodeId(), snapshot.activeNodeIds());
        PipelineGraph graph = new PipelineGraphApi(run)
                .createTreeFrom(
                        adapter, snapshot.workspaceNodes(), snapshot.enclosingIdsByNodeId(), snapshot.complete());

        assertThat("a graph built from a mid-run snapshot must not be complete", graph.complete, is(false));
        assertThat(
                "the stage statuses still describe the pre-completion snapshot",
                graph.stages.stream().map(PipelineStage::getState).toList(),
                hasItem(PipelineState.RUNNING));
    }
}
