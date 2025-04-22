package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum PipelineState {
    // BlueRunState
    QUEUED,
    RUNNING,
    PAUSED,
    SKIPPED,
    NOT_BUILT,
    FINISHED,
    // BlueRunResult
    SUCCESS,
    UNSTABLE,
    FAILURE,
    UNKNOWN,
    ABORTED;

    public static PipelineState of(NodeRunStatus status) {
        if (status.getState() == BlueRun.BlueRunState.FINISHED) {
            return switch (status.getResult()) {
                case SUCCESS -> SUCCESS;
                case UNSTABLE -> UNSTABLE;
                case FAILURE -> FAILURE;
                case NOT_BUILT -> NOT_BUILT;
                case UNKNOWN -> UNKNOWN;
                case ABORTED -> ABORTED;
            };
        }
        return switch (status.getState()) {
            case QUEUED -> QUEUED;
            case RUNNING -> RUNNING;
            case PAUSED -> PAUSED;
            case SKIPPED -> SKIPPED;
            case NOT_BUILT -> NOT_BUILT;
            case FINISHED -> FINISHED; // not reached but required for compiler
        };
    }

    @JsonValue
    @Override
    public String toString() {
        return name().toLowerCase(Locale.ROOT);
    }
}
