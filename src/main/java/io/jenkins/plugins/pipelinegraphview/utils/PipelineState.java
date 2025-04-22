package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonValue;
import hudson.model.Result;
import java.util.Locale;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

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

    public static PipelineState of(WorkflowRun run) {
        Result result = run.getResult();
        if (result == Result.SUCCESS) {
            return SUCCESS;
        } else if (result == Result.UNSTABLE) {
            return UNSTABLE;
        } else if (result == Result.FAILURE) {
            return FAILURE;
        } else if (result == Result.NOT_BUILT) {
            return NOT_BUILT;
        } else if (result == Result.ABORTED) {
            return ABORTED;
        } else if (run.isInProgress()) {
            return RUNNING;
        } else {
            return UNKNOWN;
        }
    }

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
