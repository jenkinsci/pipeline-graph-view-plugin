package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.stream.Stream;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class PipelineStatusTest {

    @ParameterizedTest
    @MethodSource("whenFinished")
    void of_usesResultWhenStateIsFinished(BlueRun.BlueRunResult result, PipelineStatus expected) {
        NodeRunStatus runStatus = new NodeRunStatus(result, BlueRun.BlueRunState.FINISHED);

        PipelineStatus status = PipelineStatus.of(runStatus);

        Assertions.assertEquals(expected, status);
    }

    private static Stream<Arguments> whenFinished() {
        return Stream.of(
            Arguments.arguments(BlueRun.BlueRunResult.SUCCESS, PipelineStatus.SUCCESS),
            Arguments.arguments(BlueRun.BlueRunResult.UNSTABLE, PipelineStatus.UNSTABLE),
            Arguments.arguments(BlueRun.BlueRunResult.FAILURE, PipelineStatus.FAILURE),
            Arguments.arguments(BlueRun.BlueRunResult.NOT_BUILT, PipelineStatus.NOT_BUILT),
            Arguments.arguments(BlueRun.BlueRunResult.UNKNOWN, PipelineStatus.UNKNOWN),
            Arguments.arguments(BlueRun.BlueRunResult.ABORTED, PipelineStatus.ABORTED)
        );
    }

    @ParameterizedTest
    @MethodSource("whenNotFinished")
    void of_usesStateWhenStateIsNotFinished(BlueRun.BlueRunState state, PipelineStatus expected) {
        NodeRunStatus runStatus = new NodeRunStatus(null, state);

        PipelineStatus status = PipelineStatus.of(runStatus);

        Assertions.assertEquals(expected, status);
    }

    private static Stream<Arguments> whenNotFinished() {
        return Stream.of(
            Arguments.arguments(BlueRun.BlueRunState.QUEUED, PipelineStatus.QUEUED),
            Arguments.arguments(BlueRun.BlueRunState.RUNNING, PipelineStatus.RUNNING),
            Arguments.arguments(BlueRun.BlueRunState.PAUSED, PipelineStatus.PAUSED),
            Arguments.arguments(BlueRun.BlueRunState.SKIPPED, PipelineStatus.SKIPPED),
            Arguments.arguments(BlueRun.BlueRunState.NOT_BUILT, PipelineStatus.NOT_BUILT)
        );
    }
}
