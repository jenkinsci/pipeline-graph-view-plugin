package io.jenkins.plugins.pipelinegraphview;

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

        /** In multi stage build (maven2), a build step might not execute due to failure in previous step */
        NOT_BUILT,

        /** Unknown status */
        UNKNOWN,

        /** Aborted run*/
        ABORTED,
    }
}
