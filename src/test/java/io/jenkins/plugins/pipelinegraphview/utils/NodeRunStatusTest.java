package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

import io.jenkins.plugins.pipelinegraphview.utils.BlueRun.BlueRunResult;
import io.jenkins.plugins.pipelinegraphview.utils.BlueRun.BlueRunState;
import java.util.List;
import org.junit.jupiter.api.Test;

class NodeRunStatusTest {

    private static NodeRunStatus status(BlueRunResult result, BlueRunState state) {
        return new NodeRunStatus(result, state);
    }

    private static String combined(NodeRunStatus... statuses) {
        NodeRunStatus combined = NodeRunStatus.combine(List.of(statuses));
        return combined.getResult() + "/" + combined.getState();
    }

    @Test
    void combineTakesWorstResult() {
        assertThat(
                combined(
                        status(BlueRunResult.SUCCESS, BlueRunState.FINISHED),
                        status(BlueRunResult.FAILURE, BlueRunState.FINISHED),
                        status(BlueRunResult.UNSTABLE, BlueRunState.FINISHED)),
                equalTo("FAILURE/FINISHED"));
        assertThat(
                combined(
                        status(BlueRunResult.FAILURE, BlueRunState.FINISHED),
                        status(BlueRunResult.ABORTED, BlueRunState.FINISHED)),
                equalTo("ABORTED/FINISHED"));
    }

    @Test
    void combineIsQueuedWhileAStepIsQueued() {
        assertThat(
                combined(
                        status(BlueRunResult.FAILURE, BlueRunState.FINISHED),
                        status(BlueRunResult.UNKNOWN, BlueRunState.QUEUED)),
                equalTo("FAILURE/QUEUED"));
    }

    @Test
    void combinePrefersRunningThenPausedOverQueued() {
        assertThat(
                combined(
                        status(BlueRunResult.UNKNOWN, BlueRunState.QUEUED),
                        status(BlueRunResult.UNKNOWN, BlueRunState.PAUSED)),
                equalTo("SUCCESS/PAUSED"));
        assertThat(
                combined(
                        status(BlueRunResult.UNKNOWN, BlueRunState.PAUSED),
                        status(BlueRunResult.UNKNOWN, BlueRunState.RUNNING),
                        status(BlueRunResult.UNKNOWN, BlueRunState.QUEUED)),
                equalTo("SUCCESS/RUNNING"));
    }
}
