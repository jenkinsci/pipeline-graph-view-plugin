package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.model.Result;

public class BlueRun {
    public enum BlueRunState {
        QUEUED,
        RUNNING,
        PAUSED,
        SKIPPED,
        NOT_BUILT,
        FINISHED
    }

    public enum BlueRunResult {
        /** Build completed successfully */
        SUCCESS,

        UNSTABLE,

        /** Build failed */
        FAILURE,

        /**
         * In multi stage build (maven2), a build step might not execute due to failure in previous step
         */
        NOT_BUILT,

        /** Unknown status */
        UNKNOWN,

        /** Aborted run */
        ABORTED;

        public static BlueRunResult fromResult(Result result) {
            if (result == Result.SUCCESS) {
                return BlueRunResult.SUCCESS;
            } else if (result == Result.UNSTABLE) {
                return BlueRunResult.UNSTABLE;
            } else if (result == Result.FAILURE) {
                return BlueRunResult.FAILURE;
            } else if (result == Result.NOT_BUILT) {
                return BlueRunResult.NOT_BUILT;
            } else if (result == Result.ABORTED) {
                return BlueRunResult.ABORTED;
            } else {
                return BlueRunResult.UNKNOWN;
            }
        }
    }
}
