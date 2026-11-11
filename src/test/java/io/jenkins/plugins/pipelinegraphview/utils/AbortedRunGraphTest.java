package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import com.github.benmanes.caffeine.cache.Cache;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import java.lang.reflect.Field;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

/**
 * An aborted run's statuses have to be final: a cleanup stage that runs in a {@code finally}
 * block must not be left running, and a stale {@code PauseAction} must not leave the run paused.
 */
@WithJenkins
class AbortedRunGraphTest {

    @Test
    void abortedRunWithFinallyCleanupStageIsFinal(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "abort-cleanup");
        job.setDefinition(new CpsFlowDefinition("""
                stage('Clean workspace') { echo 'first' }
                try {
                  stage('Project checkout') { semaphore 'hold' }
                } finally {
                  stage('Clean workspace') { echo 'cleanup' }
                }""", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("hold/1", run);

        // Force LiveGraphLifecycle.onCompleted down the computed fallback, where liveness is
        // read from the execution rather than from a live snapshot.
        clearLiveStates();

        run.doStop();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));

        PipelineGraph graph = new PipelineGraphApi(run).createTree();
        List<PipelineState> states =
                graph.stages.stream().map(PipelineStage::getState).toList();

        assertThat("the run is final", graph.complete, is(true));
        assertThat("no stage is still running", states.contains(PipelineState.RUNNING), is(false));
        assertThat("no stage is still queued", states.contains(PipelineState.QUEUED), is(false));
        assertThat("no stage is still paused", states.contains(PipelineState.PAUSED), is(false));
    }

    @Test
    void abortedRunAtInputIsNotPaused(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "abort-input");
        job.setDefinition(new CpsFlowDefinition("stage('ask') { input message: 'Continue?', ok: 'Go' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        waitForPendingInput(run);

        run.doStop();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
        assertThat("test setup: the execution is retained", run.getExecution() != null, is(true));

        PipelineGraph graph = new PipelineGraphApi(run).createTree();
        List<PipelineState> states =
                graph.stages.stream().map(PipelineStage::getState).toList();

        assertThat("the interrupted stage is aborted, not paused", states.contains(PipelineState.PAUSED), is(false));
        assertThat("the interrupted stage is not running", states.contains(PipelineState.RUNNING), is(false));
    }

    private static void waitForPendingInput(WorkflowRun run) throws Exception {
        for (int i = 0; i < 300; i++) {
            InputAction input = run.getAction(InputAction.class);
            if (input != null && !input.getExecutions().isEmpty()) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("the input step did not start");
    }

    private static void clearLiveStates() throws Exception {
        LiveGraphRegistry registry = LiveGraphRegistry.get();
        Field states = registry.getClass().getDeclaredField("states");
        states.setAccessible(true);
        ((Cache<?, ?>) states.get(registry)).invalidateAll();
    }
}
