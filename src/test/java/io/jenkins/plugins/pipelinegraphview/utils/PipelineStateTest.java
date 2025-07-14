package io.jenkins.plugins.pipelinegraphview.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.stream.Stream;
import net.sf.json.JSONArray;
import net.sf.json.JsonConfig;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

class PipelineStateTest {

    @ParameterizedTest
    @MethodSource("whenFinished")
    void of_usesResultWhenStateIsFinished(BlueRun.BlueRunResult result, PipelineState expected) {
        NodeRunStatus runStatus = new NodeRunStatus(result, BlueRun.BlueRunState.FINISHED);

        PipelineState status = PipelineState.of(runStatus);

        assertEquals(expected, status);
    }

    private static Stream<Arguments> whenFinished() {
        return Stream.of(
                Arguments.arguments(BlueRun.BlueRunResult.SUCCESS, PipelineState.SUCCESS),
                Arguments.arguments(BlueRun.BlueRunResult.UNSTABLE, PipelineState.UNSTABLE),
                Arguments.arguments(BlueRun.BlueRunResult.FAILURE, PipelineState.FAILURE),
                Arguments.arguments(BlueRun.BlueRunResult.NOT_BUILT, PipelineState.NOT_BUILT),
                Arguments.arguments(BlueRun.BlueRunResult.UNKNOWN, PipelineState.UNKNOWN),
                Arguments.arguments(BlueRun.BlueRunResult.ABORTED, PipelineState.ABORTED));
    }

    @ParameterizedTest
    @MethodSource("whenNotFinished")
    void of_usesStateWhenStateIsNotFinished(BlueRun.BlueRunState state, PipelineState expected) {
        NodeRunStatus runStatus = new NodeRunStatus(null, state);

        PipelineState status = PipelineState.of(runStatus);

        assertEquals(expected, status);
    }

    private static Stream<Arguments> whenNotFinished() {
        return Stream.of(
                Arguments.arguments(BlueRun.BlueRunState.QUEUED, PipelineState.QUEUED),
                Arguments.arguments(BlueRun.BlueRunState.RUNNING, PipelineState.RUNNING),
                Arguments.arguments(BlueRun.BlueRunState.PAUSED, PipelineState.PAUSED),
                Arguments.arguments(BlueRun.BlueRunState.SKIPPED, PipelineState.SKIPPED),
                Arguments.arguments(BlueRun.BlueRunState.NOT_BUILT, PipelineState.NOT_BUILT));
    }

    private static final JsonConfig MAPPER = new JsonConfig();
    static {
        PipelineState.PipelineStateJsonProcessor.configure(MAPPER);
    }

    @ParameterizedTest
    @CsvSource({
        "QUEUED, queued",
        "RUNNING, running",
        "PAUSED, paused",
        "SKIPPED, skipped",
        "NOT_BUILT, not_built",
        "FINISHED, finished",
        "SUCCESS, success",
        "UNSTABLE, unstable",
        "FAILURE, failure",
        "UNKNOWN, unknown",
        "ABORTED, aborted"
    })
    void serialization(String input, String expected) {
        PipelineState status = PipelineState.valueOf(input);

        String serialized = JSONArray.fromObject(status, MAPPER).toString();

        assertEquals("[\"%s\"]".formatted(expected), serialized);
    }
}
